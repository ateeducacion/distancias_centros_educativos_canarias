"""Load versioned non-teaching educational centers missing from the official CSV."""

from __future__ import annotations

import csv
from pathlib import Path
import re

from .errors import ValidationError
from .islands import normalize_island

_REQUIRED_FIELDS = {
    "code",
    "name",
    "island",
    "municipality",
    "locality",
    "address",
    "postal_code",
    "nature",
    "center_type",
    "host_center_code",
    "longitude",
    "latitude",
}


def _validated_entry(entry: dict[str, str], line: int) -> dict[str, str]:
    has_host = bool(entry["host_center_code"])
    has_longitude = bool(entry["longitude"])
    has_latitude = bool(entry["latitude"])
    has_coordinates = has_longitude and has_latitude

    if has_longitude != has_latitude:
        raise ValidationError(
            f"Additional center on line {line} must define both longitude and latitude"
        )
    if has_host == has_coordinates:
        raise ValidationError(
            f"Additional center {entry['code']} must define either "
            "host_center_code or longitude/latitude"
        )

    return entry


def load_additional_centers(
    path: Path,
    official_centers: list[dict[str, object]],
    code_pattern: str = r"^[0-9]{8}$",
) -> list[dict[str, object]]:
    """Load additional centers and resolve shared coordinates by center code."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise ValidationError(f"Cannot read additional centers from {path}: {exc}") from exc

    reader = csv.DictReader(text.splitlines())
    headers = set(reader.fieldnames or [])
    if missing := _REQUIRED_FIELDS - headers:
        raise ValidationError(
            f"Additional centers schema changed; missing columns: {sorted(missing)}"
        )

    code_re = re.compile(code_pattern)
    known = {str(center["code"]): center for center in official_centers}
    pending: dict[str, dict[str, str]] = {}

    for line, row in enumerate(reader, start=2):
        entry = _validated_entry(
            {
                key: value.strip() if value is not None else ""
                for key, value in row.items()
            },
            line,
        )
        code = entry["code"]
        if not code_re.fullmatch(code):
            raise ValidationError(f"Invalid additional center code: {code!r}")
        if code in known or code in pending:
            raise ValidationError(f"Duplicate center code: {code}")
        pending[code] = entry

    loaded: list[dict[str, object]] = []
    while pending:
        resolved_in_pass = 0
        for code, entry in list(pending.items()):
            island_id, island_name = normalize_island(entry["island"])
            host_code = entry["host_center_code"]
            if host_code:
                host = known.get(host_code)
                if host is None:
                    continue
                if int(host["island_id"]) != island_id:
                    raise ValidationError(
                        f"Additional center {code} and host {host_code} are on "
                        "different islands"
                    )
                longitude = float(host["longitude"])
                latitude = float(host["latitude"])
            else:
                try:
                    longitude = float(entry["longitude"])
                    latitude = float(entry["latitude"])
                except ValueError as exc:
                    raise ValidationError(
                        f"Additional center {code} has invalid coordinates"
                    ) from exc

            if not -19 <= longitude <= -13 or not 27 <= latitude <= 30:
                raise ValidationError(
                    f"Additional center {code} has coordinates outside Canarias"
                )

            center: dict[str, object] = {
                "code": code,
                "name": entry["name"],
                "address": entry["address"],
                "locality": entry["locality"],
                "postal_code": entry["postal_code"],
                "municipality": entry["municipality"],
                "island": island_name,
                "island_id": island_id,
                "nature": entry["nature"],
                "center_type": entry["center_type"],
                "longitude": longitude,
                "latitude": latitude,
            }
            loaded.append(center)
            known[code] = center
            del pending[code]
            resolved_in_pass += 1

        if not resolved_in_pass:
            unresolved = ", ".join(
                f"{code}->{entry['host_center_code']}"
                for code, entry in sorted(pending.items())
            )
            raise ValidationError(
                f"Unresolved additional center host references: {unresolved}"
            )

    return loaded
