"""Stable island identifiers; never derive these from alphabetical order."""

import unicodedata

ISLANDS: dict[int, str] = {1:"EL_HIERRO",2:"FUERTEVENTURA",3:"GRAN_CANARIA",4:"LA_GOMERA",5:"LA_PALMA",6:"LANZAROTE",7:"TENERIFE"}
_ALIASES = {"EL HIERRO":1,"FUERTEVENTURA":2,"GRAN CANARIA":3,"LA GOMERA":4,"LA PALMA":5,"LANZAROTE":6,"TENERIFE":7}

def normalize_island(value: str) -> tuple[int, str]:
    """Return stable numeric and symbolic identifiers."""
    key = " ".join(unicodedata.normalize("NFKC", value).strip().upper().split())
    island_id = _ALIASES.get(key)
    if island_id is None:
        raise ValueError(f"Unknown island: {value!r}")
    return island_id, ISLANDS[island_id]
