import pytest
from canarias_route_matrix.islands import normalize_island

def test_stable_island_table():
 assert normalize_island(" Gran Canaria ")== (3,"GRAN_CANARIA")
 assert normalize_island("Tenerife")== (7,"TENERIFE")
 with pytest.raises(ValueError): normalize_island("Atlantis")
