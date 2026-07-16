"""Load versioned non-teaching educational centers missing from the official CSV."""

from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any

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
}
_COORDINATE_FIELDS = {"longitude", "latitude"}


def _validated_entry(entry: object, index: int) -> dict[str, Any]:
    if not isinstance(entry, dict):
        raise ValidationError(f"Additional center #{index} must be an object")

    missing = sorted(_REQUIRED_FIELDS - entry.keys())
    if missing:
        raise ValidationError(
            f"Additional center #{index} is missing fields: {', '.join(missing)}"
        )

    has_host = bool(str(entry.get("host_center_code", "")).strip())
    has_coordinates = _COORDINATE_FIELDS <= entry.keys()
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
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValidationError(f"Cannot read additional centers from {path}: {exc}") from exc

    if payload.get("schema_version") != 1:
        raise ValidationError("Unsupported additional-centers schema_version")

    raw_entries = payload.get("centers")
    if not isinstance(raw_entries, list):
        raise ValidationError("additional-centers.json must contain a centers array")

    code_re = re.compile(code_pattern)
    known = {str(center["code"]): center for center in official_centers}
    pending: dict[str, dict[str, Any]] = {}

    for index, raw_entry in enumerate(raw_entries, start=1):
        entry = _validated_entry(raw_entry, index)
        code = str(entry["code"]).strip()
        if not code_re.fullmatch(code):
            raise ValidationError(f"Invalid additional center code: {code!r}")
        if code in known or code in pending:
            raise ValidationError(f"Duplicate center code: {code}")
        pending[code] = entry

    loaded: list[dict[str, object]] = []
    while pending:
        resolved_in_pass = 0
        for code, entry in list(pending.items()):
            island_id, island_name = normalize_island(str(entry["island"]))
            host_code = str(entry.get("host_center_code", "")).strip()
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
                longitude = float(entry["longitude"])
                latitude = float(entry["latitude"])

            if not -18.5 <= longitude <= -13.0 or not 27.5 <= latitude <= 29.5:
                raise ValidationError(
                    f"Additional center {code} has coordinates outside Canarias"
                )

            center: dict[str, object] = {
                "code": code,
                "name": str(entry["name"]).strip(),
                "address": str(entry["address"]).strip(),
                "locality": str(entry["locality"]).strip(),
                "postal_code": str(entry["postal_code"]).strip(),
                "municipality": str(entry["municipality"]).strip(),
                "island": island_name,
                "island_id": island_id,
                "nature": str(entry["nature"]).strip(),
                "center_type": str(entry["center_type"]).strip(),
                "longitude": longitude,
                "latitude": latitude,
            }
            loaded.append(center)
            known[code] = center
            del pending[code]
            resolved_in_pass += 1

        if not resolved_in_pass:
            unresolved = ", ".join(
                f"{code}->{entry.get('host_center_code')}"
                for code, entry in sorted(pending.items())
            )
            raise ValidationError(
                f"Unresolved additional center host references: {unresolved}"
            )

    return loaded
