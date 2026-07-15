"""Regenerate the shared fictional CEDIST04 conformance fixture.

Run with ``PYTHONPATH=src/python python3 tests/fixtures/build_fixture.py``.
Writes ``data/samples/{sample.dat,sample-centers.json,sample-manifest.json}``.
"""

from pathlib import Path
import hashlib
import json

from canarias_route_matrix.binary.format import (
    CURRENT_FORMAT,
    MAX_DISTANCE_METERS,
    MINOR,
)
from canarias_route_matrix.binary.writer import write_binary

ROOT = Path(__file__).resolve().parents[2]

CENTERS = [
    {
        "code": "10000001",
        "name": "Centro Ficticio Norte",
        "island": "GRAN_CANARIA",
        "island_id": 3,
        "municipality": "Municipio Alfa",
        "locality": "Localidad Uno",
        "address": "Calle Uno",
        "postal_code": "00001",
        "longitude": -15.0,
        "latitude": 28.0,
        "nature": "PUBLIC",
        "center_type": "SCHOOL",
    },
    {
        "code": "10000002",
        "name": "Centro Ficticio Sur",
        "island": "GRAN_CANARIA",
        "island_id": 3,
        "municipality": "Municipio Beta",
        "locality": "Localidad Dos",
        "address": "Calle Dos",
        "postal_code": "00002",
        "longitude": -15.1,
        "latitude": 27.9,
        "nature": "PUBLIC",
        "center_type": "SCHOOL",
    },
    {
        "code": "10000009",
        "name": "Centro Ficticio Este",
        "island": "GRAN_CANARIA",
        "island_id": 3,
        "municipality": "Municipio Gamma",
        "locality": "Localidad Tres",
        "address": "Calle Tres",
        "postal_code": "00003",
        "longitude": -15.2,
        "latitude": 27.8,
        "nature": "PRIVATE",
        "center_type": "SCHOOL",
    },
    {
        "code": "20000004",
        "name": "Centro Ficticio Isla Dos",
        "island": "TENERIFE",
        "island_id": 7,
        "municipality": "Municipio Delta",
        "locality": "Localidad Cuatro",
        "address": "Calle Cuatro",
        "postal_code": "00004",
        "longitude": -16.3,
        "latitude": 28.3,
        "nature": "PUBLIC",
        "center_type": "SCHOOL",
    },
]

# Directed distances in metres (row = origin, col = destination). ``None`` marks
# an unreachable pair. Kept identical to the historical fixture so the
# cross-language conformance values are unchanged (10000001->10000002 == 1200,
# reverse == 1100, 10000002->10000009 unreachable).
MATRICES = {
    3: [[0, 1200, 2500], [1100, 0, None], [2400, 2100, 0]],
    7: [[0]],
}


def main() -> None:
    out = ROOT / "data/samples"
    out.mkdir(parents=True, exist_ok=True)
    binary = out / "sample.dat"
    write_binary(binary, CENTERS, MATRICES)

    centers_text = (
        json.dumps(CENTERS, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    )
    (out / "sample-centers.json").write_text(centers_text, encoding="utf-8")

    digest = hashlib.sha256(binary.read_bytes()).hexdigest()
    manifest = {
        "artifacts": {"sample.dat": {"sha256": digest, "size": binary.stat().st_size}},
        "counts": {
            "centers": 4,
            "directed_distances": 10,
            "islands": {"3": 3, "7": 1},
            "maximum_distance_meters": 2500,
            "unreachable_distances": 1,
        },
        "data_version": "fixture-4",
        "format": {
            "cell_size_bytes": CURRENT_FORMAT.cell_size,
            "distance_unit_meters": CURRENT_FORMAT.distance_unit_meters,
            "endianness": "little",
            "magic": CURRENT_FORMAT.magic.decode("ascii"),
            "major": CURRENT_FORMAT.major,
            "maximum_distance_meters": MAX_DISTANCE_METERS,
            "metric": "road_distance_meters",
            "minor": MINOR,
            "rounding": "nearest decameter, halves up",
            "storage_type": "uint16",
            "unreachable_value": CURRENT_FORMAT.unreachable,
        },
        "schema_version": 1,
    }
    (out / "sample-manifest.json").write_text(
        json.dumps(manifest, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
