import io
import json

import pytest

import canarias_route_matrix.osrm as osrm
from canarias_route_matrix.osrm import coordinate_separation_m, round_osrm


def test_osrm_rounding_policy() -> None:
    assert round_osrm(0.0) == 0
    assert round_osrm(1.49) == 1
    assert round_osrm(1.5) == 2
    with pytest.raises(ValueError):
        round_osrm(-0.5)


def test_coordinate_separation_policy() -> None:
    assert (
        coordinate_separation_m(
            (-13.840207, 28.874604),
            (-13.840212, 28.874604),
        )
        < 1
    )
    assert coordinate_separation_m((-13.84, 28.87), (-13.85, 28.87)) > 1


def test_table_requests_only_distance(monkeypatch: pytest.MonkeyPatch) -> None:
    requested_urls: list[str] = []

    def fake_urlopen(url: str, timeout: float) -> io.StringIO:
        requested_urls.append(url)
        assert timeout == 10
        return io.StringIO(json.dumps({"code": "Ok", "distances": [[123.6]]}))

    monkeypatch.setattr(osrm, "urlopen", fake_urlopen)

    distances = osrm.table(
        "http://osrm.test",
        [(-15.4, 28.1)],
        [(-15.5, 28.0)],
        timeout=10,
        retries=1,
    )

    assert distances == [[124]]
    assert "annotations=distance" in requested_urls[0]
    assert "duration" not in requested_urls[0]
