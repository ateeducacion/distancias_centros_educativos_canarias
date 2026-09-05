#!/usr/bin/env python3
"""Genera www/assets/islands.js con los contornos de las islas.

Fuente: Natural Earth 1:10m "land" (dominio público). El fichero de entrada se
descarga aparte, por ejemplo:

    curl -sO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson
    python3 scripts/generate-island-outlines.py ne_10m_land.geojson

A 1:10m cada isla ya viene con 19-85 vértices, así que no se simplifica nada:
sólo se recortan los anillos del archipiélago, se asignan a su isla y se
redondean a 4 decimales (~11 m).
"""

from __future__ import annotations

import json
import sys
from collections.abc import Iterator
from itertools import pairwise
from pathlib import Path
from typing import Any

Ring = list[list[float]]

# Un punto en tierra por isla; La Graciosa se dibuja junto a Lanzarote.
ISLAND_SEEDS: dict[str, list[tuple[float, float]]] = {
    "EL_HIERRO": [(-18.00, 27.74)],
    "FUERTEVENTURA": [(-14.02, 28.40)],
    "GRAN_CANARIA": [(-15.58, 27.96)],
    "LA_GOMERA": [(-17.22, 28.11)],
    "LA_PALMA": [(-17.85, 28.68)],
    "LANZAROTE": [(-13.62, 29.03), (-13.51, 29.26)],
    "TENERIFE": [(-16.60, 28.29)],
}


def outer_rings(geometry: dict[str, Any]) -> Iterator[Ring]:
    if geometry["type"] == "Polygon":
        yield geometry["coordinates"][0]
    else:
        for polygon in geometry["coordinates"]:
            yield polygon[0]


def contains(ring: Ring, point: tuple[float, float]) -> bool:
    """Ray casting sobre un anillo cerrado."""
    x, y = point
    inside = False
    for (x1, y1), (x2, y2) in pairwise(ring):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) / (y2 - y1) * (x2 - x1):
            inside = not inside
    return inside


def main(source: str) -> None:
    rings = [
        ring
        for feature in json.loads(Path(source).read_text())["features"]
        for ring in outer_rings(feature["geometry"])
    ]

    outlines = {}
    for island, seeds in ISLAND_SEEDS.items():
        matches = [ring for ring in rings if any(contains(ring, seed) for seed in seeds)]
        if len(matches) != len(seeds):
            raise SystemExit(f"{island}: {len(matches)} anillos para {len(seeds)} semillas")
        outlines[island] = [
            [[round(lng, 4), round(lat, 4)] for lng, lat in ring] for ring in matches
        ]

    body = "\n".join(
        f"  {island}: {json.dumps(rings_, separators=(',', ' '))},"
        for island, rings_ in sorted(outlines.items())
    )
    Path("www/assets/islands.js").write_text(
        "// Generado por scripts/generate-island-outlines.py — no editar a mano.\n"
        "// Contornos de Natural Earth 1:10m (dominio público), como anillos [lng, lat].\n"
        f"export const ISLAND_OUTLINES = {{\n{body}\n}};\n"
    )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ne_10m_land.geojson")
