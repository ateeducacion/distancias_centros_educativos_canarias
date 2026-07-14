from pathlib import Path

from canarias_route_matrix.binary.reader import Reader
from canarias_route_matrix.binary.writer import write_binary


def test_distance_only_writer_round_trip(tmp_path: Path) -> None:
    centers = [
        {"code": "10000001", "island_id": 3},
        {"code": "10000002", "island_id": 3},
    ]
    matrices = {3: [[0, 1234], [1200, 0]]}
    path = tmp_path / "distances.dat"

    write_binary(path, centers, matrices)

    assert path.read_bytes()[:8] == b"CEDIST02"
    assert path.stat().st_size == 64 + 2 * 12 + 16 + 2 * 2 * 4
    with Reader(path) as reader:
        assert reader.get_distance("10000001", "10000002").distance_meters == 1234
        assert reader.get_distance("10000002", "10000001").distance_meters == 1200
