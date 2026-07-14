from pathlib import Path

import pytest

from canarias_route_matrix.errors import ValidationError
from canarias_route_matrix.transport_nodes import load_transport_nodes, merge_locations

ROOT = Path(__file__).resolve().parents[2]


def test_transport_nodes_cover_every_routed_island() -> None:
    nodes = load_transport_nodes(ROOT / "config/transport-nodes.json")

    airports = {int(node["island_id"]) for node in nodes if node["location_type"] == "AIRPORT"}
    ports = {int(node["island_id"]) for node in nodes if node["location_type"] == "PORT"}

    assert airports == set(range(1, 8))
    assert ports == set(range(1, 8))
    assert len([node for node in nodes if node["location_type"] == "AIRPORT"]) == 8
    assert len([node for node in nodes if node["location_type"] == "PORT"]) == 15


def test_merge_locations_marks_centers_and_rejects_collisions() -> None:
    center = {"code": "35000001", "name": "Centro", "island_id": 3}
    airport = {
        "code": "98030001",
        "name": "Aeropuerto",
        "island_id": 3,
        "location_type": "AIRPORT",
    }

    merged = merge_locations([center], [airport])

    assert merged[0]["location_type"] == "EDUCATION_CENTER"
    assert merged[1]["location_type"] == "AIRPORT"
    with pytest.raises(ValidationError, match="Duplicate routable location code"):
        merge_locations([center], [center])
