import json
from pathlib import Path

from canarias_route_matrix.manifest import sha256

ROOT = Path(__file__).resolve().parents[2]


def test_shortest_distance_profile_is_configured() -> None:
    routing = json.loads((ROOT / "config/routing.json").read_text(encoding="utf-8"))
    profile_path = ROOT / routing["profile_path"]

    assert routing["profile"] == "car-shortest-distance"
    assert routing["profile_base"] == "/opt/car.lua"
    assert routing["weight_name"] == "distance"
    assert profile_path.is_file()
    profile_source = profile_path.read_text(encoding="utf-8")
    assert 'local profile_api = dofile("/opt/car.lua")' in profile_source
    assert 'profile.properties.weight_name = "distance"' in profile_source
    assert "return profile_api" in profile_source
    assert len(sha256(profile_path)) == 64
