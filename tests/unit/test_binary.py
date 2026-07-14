from pathlib import Path

import pytest

from canarias_route_matrix.binary.reader import Reader
from canarias_route_matrix.errors import (
    CrossIslandRouteError,
    InvalidFormatError,
    UnknownCenterError,
    UnreachableRouteError,
)

FIXTURE = Path("data/samples/sample.dat")


def test_directed_and_nonconsecutive_codes() -> None:
    with Reader(FIXTURE) as reader:
        assert reader.get_distance("10000001", "10000002").distance_meters == 1200
        assert reader.get_distance("10000002", "10000001").distance_meters == 1100
        assert reader.find("10000009").local_index == 2


def test_self_cross_island_and_unreachable() -> None:
    with Reader(FIXTURE) as reader:
        assert reader.get_distance("10000001", "10000001").distance_meters == 0
        with pytest.raises(CrossIslandRouteError):
            reader.get_distance("10000001", "20000004")
        with pytest.raises(UnreachableRouteError):
            reader.get_distance("10000002", "10000009")


def test_unknown_and_invalid() -> None:
    with Reader(FIXTURE) as reader:
        with pytest.raises(UnknownCenterError):
            reader.find("10000003")
        with pytest.raises(UnknownCenterError):
            reader.find("abc")


@pytest.mark.parametrize("mutation", [b"BADMAGIC", b"CEDIST02"])
def test_invalid_files(tmp_path: Path, mutation: bytes) -> None:
    data = bytearray(FIXTURE.read_bytes())
    if mutation == b"BADMAGIC":
        data[:8] = mutation
    else:
        data = data[:-1]
    path = tmp_path / "bad.dat"
    path.write_bytes(data)
    with pytest.raises(InvalidFormatError):
        Reader(path)
