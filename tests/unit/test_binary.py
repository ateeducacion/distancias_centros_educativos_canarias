from pathlib import Path

import pytest

from canarias_route_matrix.binary.reader import Reader
from canarias_route_matrix.errors import (
    CrossIslandRouteError,
    InvalidFormatError,
    UnknownCenterError,
    UnreachableRouteError,
)

FIXTURES = [
    Path("data/samples/sample.dat"),
    Path("data/samples/sample-v2.dat"),
]


@pytest.mark.parametrize("fixture", FIXTURES)
def test_directed_and_nonconsecutive_codes(fixture: Path) -> None:
    with Reader(fixture) as reader:
        assert reader.get_distance("10000001", "10000002").distance_meters == 1200
        assert reader.get_distance("10000002", "10000001").distance_meters == 1100
        assert reader.find("10000009").local_index == 2


@pytest.mark.parametrize("fixture", FIXTURES)
def test_self_cross_island_and_unreachable(fixture: Path) -> None:
    with Reader(fixture) as reader:
        assert reader.get_distance("10000001", "10000001").distance_meters == 0
        with pytest.raises(CrossIslandRouteError):
            reader.get_distance("10000001", "20000004")
        with pytest.raises(UnreachableRouteError):
            reader.get_distance("10000002", "10000009")


@pytest.mark.parametrize("fixture", FIXTURES)
def test_unknown_and_invalid(fixture: Path) -> None:
    with Reader(fixture) as reader:
        with pytest.raises(UnknownCenterError):
            reader.find("10000003")
        with pytest.raises(UnknownCenterError):
            reader.find("abc")


@pytest.mark.parametrize("mutation", ["magic", "version", "truncated"])
def test_invalid_files(tmp_path: Path, mutation: str) -> None:
    data = bytearray(FIXTURES[0].read_bytes())
    if mutation == "magic":
        data[:8] = b"BADMAGIC"
    elif mutation == "version":
        data[8:10] = (2).to_bytes(2, "little")
    else:
        data = data[:-1]
    path = tmp_path / "bad.dat"
    path.write_bytes(data)
    with pytest.raises(InvalidFormatError):
        Reader(path)
