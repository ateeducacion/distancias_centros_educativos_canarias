"""Tests for versioned non-teaching educational centers."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest
from canarias_route_matrix.additional_centers import load_additional_centers
from canarias_route_matrix.errors import ValidationError
from canarias_route_matrix.islands import normalize_island

_FIELDS = [
    "code",
    "name",
    "island",
    "municipality",
    "locality",
    "address",
    "postal_code",
    "nature",
    "center_type",
    "host_center_code",
    "longitude",
    "latitude",
]


def official_center(code: str = "38011017") -> dict[str, object]:
    """Return a minimal valid official center fixture."""
    return {
        "code": code,
        "name": "EOI VALVERDE",
        "address": "C/ TRINISTA, 2",
        "locality": "VALVERDE",
        "postal_code": "38900",
        "municipality": "VALVERDE",
        "island": "EL_HIERRO",
        "island_id": 1,
        "nature": "Público",
        "center_type": "Docente",
        "longitude": -17.91587942,
        "latitude": 27.813353616,
    }


def write_config(path: Path, centers: list[dict[str, object]]) -> None:
    """Write an additional-centers fixture."""
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=_FIELDS)
        writer.writeheader()
        writer.writerows(centers)


def base_entry(code: str) -> dict[str, object]:
    """Return common fields for an additional-center fixture."""
    return {
        "code": code,
        "name": f"CENTER {code}",
        "island": "EL HIERRO",
        "municipality": "VALVERDE",
        "locality": "VALVERDE",
        "address": "C/ TRINISTA, 2",
        "postal_code": "38900",
        "nature": "Público",
        "center_type": "EOEP",
        "host_center_code": "",
        "longitude": "",
        "latitude": "",
    }


def test_shared_and_chained_hosts_copy_exact_coordinates(tmp_path: Path) -> None:
    """A shared site must resolve to the exact host coordinates, including chains."""
    cep = base_entry("38700140") | {
        "center_type": "CEP",
        "host_center_code": "38011017",
    }
    eoep = base_entry("38702571") | {"host_center_code": "38700140"}
    config = tmp_path / "additional-centers.csv"
    write_config(config, [cep, eoep])

    loaded = load_additional_centers(config, [official_center()])
    by_code = {center["code"]: center for center in loaded}

    assert by_code["38700140"]["longitude"] == -17.91587942
    assert by_code["38700140"]["latitude"] == 27.813353616
    assert by_code["38702571"]["longitude"] == -17.91587942
    assert by_code["38702571"]["latitude"] == 27.813353616


def test_direct_coordinates_are_supported(tmp_path: Path) -> None:
    """Standalone non-teaching centers may provide reviewed coordinates."""
    center = base_entry("38700388") | {
        "longitude": -17.916,
        "latitude": 27.814,
    }
    config = tmp_path / "additional-centers.csv"
    write_config(config, [center])

    loaded = load_additional_centers(config, [official_center()])

    assert loaded[0]["longitude"] == -17.916
    assert loaded[0]["latitude"] == 27.814
    assert loaded[0]["island"] == "EL_HIERRO"


def test_unresolved_host_is_rejected(tmp_path: Path) -> None:
    """Unknown host references must not silently create an invalid location."""
    center = base_entry("38702571") | {"host_center_code": "99999999"}
    config = tmp_path / "additional-centers.csv"
    write_config(config, [center])

    with pytest.raises(ValidationError, match="Unresolved"):
        load_additional_centers(config, [official_center()])


def test_duplicate_official_code_is_rejected(tmp_path: Path) -> None:
    """Additional centers must never replace an official center row."""
    center = base_entry("38011017") | {
        "longitude": -17.91587942,
        "latitude": 27.813353616,
    }
    config = tmp_path / "additional-centers.csv"
    write_config(config, [center])

    with pytest.raises(ValidationError, match="Duplicate center code"):
        load_additional_centers(config, [official_center()])


def test_production_csv_includes_ate_offices() -> None:
    """The versioned additional-centers file must load the two ATE/Medusa seats."""
    path = Path("config/additional-centers.csv")
    with path.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    codes = {row["code"].strip() for row in rows}
    assert "35700081" in codes
    assert "38700195" in codes

    additional_codes = codes
    official: list[dict[str, object]] = []
    seen_hosts: set[str] = set()
    for row in rows:
        host = (row.get("host_center_code") or "").strip()
        if not host or host in additional_codes or host in seen_hosts:
            continue
        island_id, island_name = normalize_island(row["island"])
        longitude, latitude = -16.0, 28.0
        if host == "38010700":
            longitude, latitude = -16.3064789651204, 28.4741412375899
        official.append(
            official_center(host)
            | {
                "island": island_name,
                "island_id": island_id,
                "longitude": longitude,
                "latitude": latitude,
            }
        )
        seen_hosts.add(host)

    loaded = load_additional_centers(path, official)
    by_code = {center["code"]: center for center in loaded}

    assert by_code["35700081"]["name"] == "OFICINA MEDUSA GRAN CANARIA"
    assert by_code["35700081"]["center_type"] == "ATE"
    assert by_code["35700081"]["longitude"] == -15.4207
    assert by_code["35700081"]["latitude"] == 28.1006
    assert by_code["38700195"]["name"] == "OFICINA MEDUSA LA LAGUNA"
    assert by_code["38700195"]["center_type"] == "ATE"
    assert by_code["38700195"]["address"] == "C/ SATURNO, S/N. TRASERA DEL IES DOMINGO PÉREZ MINIK"
    assert by_code["38700195"]["postal_code"] == "38205"
    assert by_code["38700195"]["longitude"] == -16.3064789651204
    assert by_code["38700195"]["latitude"] == 28.4741412375899
