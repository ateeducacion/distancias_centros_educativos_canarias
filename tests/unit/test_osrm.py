import pytest

from canarias_route_matrix.osrm import coordinate_separation_m, round_osrm


def test_osrm_rounding_policy():
    assert round_osrm(0.0) == 0
    assert round_osrm(1.49) == 1
    assert round_osrm(1.5) == 2
    with pytest.raises(ValueError):
        round_osrm(-0.5)


def test_coordinate_separation_policy():
    assert coordinate_separation_m((-13.840207, 28.874604), (-13.840212, 28.874604)) < 1
    assert coordinate_separation_m((-13.84, 28.87), (-13.85, 28.87)) > 1
