"""Validate and merge curated airport and port nodes."""
from __future__ import annotations

from collections.abc import Mapping, Sequence
import json
from pathlib import Path
from typing import cast

from .errors import ValidationError
from .islands import ISLANDS

_CODE_PREFIXES = {"AIRPORT": "98", "PORT": "99"}


def _number(value: object, field: str, code: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(f"Transport node {code} has invalid {field}")
    return float(value)


def load_transport_nodes(path: Path) -> list[dict[str, object]]:
    """Load curated transport nodes and enforce the reserved numeric code scheme."""
    payload = cast(dict[str, object], json.loads(path.read_text(encoding="utf-8")))
    if payload.get("schema_version") != 1:
        raise ValidationError("Unsupported transport node schema version")
    raw_nodes = payload.get("nodes")
    if not isinstance(raw_nodes, list):
        raise ValidationError("Transport node configuration must contain a nodes list")

    nodes: list[dict[str, object]] = []
    seen: set[str] = set()
    for raw_node in raw_nodes:
        if not isinstance(raw_node, dict):
            raise ValidationError("Transport node entries must be objects")
        node = cast(dict[str, object], raw_node)
        code = node.get("code")
        name = node.get("name")
        location_type = node.get("location_type")
        island_id = node.get("island_id")
        municipality = node.get("municipality", "")
        locality = node.get("locality", "")
        address = node.get("address", "")
        postal_code = node.get("postal_code", "")

        if not isinstance(code, str) or len(code) != 8 or not code.isdigit():
            raise ValidationError("Transport node codes must contain exactly eight digits")
        if code in seen:
            raise ValidationError(f"Duplicate transport node code: {code}")
        seen.add(code)
        if not isinstance(name, str) or not name.strip():
            raise ValidationError(f"Transport node {code} has no name")
        if not isinstance(location_type, str) or location_type not in _CODE_PREFIXES:
            raise ValidationError(f"Transport node {code} has an invalid location_type")
        if not isinstance(island_id, int) or isinstance(island_id, bool) or island_id not in ISLANDS:
            raise ValidationError(f"Transport node {code} has an invalid island_id")
        expected_prefix = f"{_CODE_PREFIXES[location_type]}{island_id:02d}"
        if not code.startswith(expected_prefix):
            raise ValidationError(
                f"Transport node {code} must start with {expected_prefix} for "
                f"{location_type} on island {island_id}"
            )
        for field_name, field_value in (
            ("municipality", municipality),
            ("locality", locality),
            ("address", address),
            ("postal_code", postal_code),
        ):
            if not isinstance(field_value, str):
                raise ValidationError(f"Transport node {code} has invalid {field_name}")

        longitude = _number(node.get("longitude"), "longitude", code)
        latitude = _number(node.get("latitude"), "latitude", code)
        if not (-19 <= longitude <= -13 and 27 <= latitude <= 30):
            raise ValidationError(f"Transport node {code} is outside Canary Islands bounds")

        normalized: dict[str, object] = {
            "code": code,
            "name": name.strip(),
            "island": ISLANDS[island_id],
            "island_id": island_id,
            "municipality": municipality,
            "locality": locality,
            "address": address,
            "postal_code": postal_code,
            "longitude": longitude,
            "latitude": latitude,
            "nature": "PUBLIC",
            "center_type": location_type,
            "location_type": location_type,
        }
        if location_type == "AIRPORT" and isinstance(node.get("iata"), str):
            normalized["iata"] = node["iata"]
        nodes.append(normalized)

    return sorted(nodes, key=lambda item: str(item["code"]))


def merge_locations(
    centers: Sequence[Mapping[str, object]],
    transport_nodes: Sequence[Mapping[str, object]],
) -> list[dict[str, object]]:
    """Return centers and transport nodes as one code-sorted routable location list."""
    locations: list[dict[str, object]] = []
    seen: set[str] = set()
    for raw_location in [*centers, *transport_nodes]:
        location = dict(raw_location)
        code = str(location.get("code", ""))
        if code in seen:
            raise ValidationError(f"Duplicate routable location code: {code}")
        seen.add(code)
        location.setdefault("location_type", "EDUCATION_CENTER")
        locations.append(location)
    return sorted(locations, key=lambda item: str(item["code"]))
