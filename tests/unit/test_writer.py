from pathlib import Path

import pytest

from canarias_route_matrix.binary.format import MAX_DISTANCE_METERS
from canarias_route_matrix.binary.reader import Reader
from canarias_route_matrix.binary.writer import write_binary

CENTERS = [
    {"code": "10000001", "island_id": 3},
    {"code": "10000002", "island_id": 3},
]


def test_cedist03_writer_round_trip_and_quantization(tmp_path: Path) -> None:
    path = tmp_path / "distances.dat"
    write_binary(path, CENTERS, {3: [[0, 1234], [1235, 0]]})

    assert path.read_bytes()[:8] == b"CEDIST03"
    assert path.stat().st_size == 64 + 2 * 12 + 16 + 2 * 2 * 2
    with Reader(path) as reader:
        assert reader.get_distance("10000001", "10000002").distance_meters == 1230
        assert reader.get_distance("10000002", "10000001").distance_meters == 1240


def test_cedist02_writer_remains_available_for_compatibility(tmp_path: Path) -> None:
    path = tmp_path / "distances-v2.dat"
    write_binary(path, CENTERS, {3: [[0, 1234], [1200, 0]]}, format_major=2)

    assert path.read_bytes()[:8] == b"CEDIST02"
    assert path.stat().st_size == 64 + 2 * 12 + 16 + 2 * 2 * 4
    with Reader(path) as reader:
        assert reader.get_distance("10000001", "10000002").distance_meters == 1234


def test_cedist03_maximum_distance_is_enforced(tmp_path: Path) -> None:
    path = tmp_path / "distances.dat"
    write_binary(path, CENTERS, {3: [[0, MAX_DISTANCE_METERS], [10, 0]]})
    with Reader(path) as reader:
        assert (
            reader.get_distance("10000001", "10000002").distance_meters
            == MAX_DISTANCE_METERS
        )

    with pytest.raises(ValueError, match="exceeds the CEDIST03 maximum"):
        write_binary(
            path,
            CENTERS,
            {3: [[0, MAX_DISTANCE_METERS + 1], [10, 0]]},
        )
