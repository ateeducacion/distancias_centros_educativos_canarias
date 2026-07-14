"""OSRM nearest and distance-table client with validation."""
from __future__ import annotations

from dataclasses import dataclass
import json
import math
import time
from urllib.parse import urlencode
from urllib.request import urlopen


@dataclass(frozen=True)
class SnapResult:
    official_longitude: float
    official_latitude: float
    snapped_longitude: float
    snapped_latitude: float
    separation_m: float
    warning: bool


def round_osrm(value: float) -> int:
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"OSRM value must be finite and non-negative, got {value!r}")
    return math.floor(value + 0.5)


def coordinate_separation_m(
    source: tuple[float, float],
    destination: tuple[float, float],
) -> float:
    longitude_1, latitude_1 = map(math.radians, source)
    longitude_2, latitude_2 = map(math.radians, destination)
    longitude_delta = longitude_2 - longitude_1
    latitude_delta = latitude_2 - latitude_1
    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(latitude_1)
        * math.cos(latitude_2)
        * math.sin(longitude_delta / 2) ** 2
    )
    return 6_371_000 * 2 * math.asin(math.sqrt(value))


def nearest(
    base_url: str,
    longitude: float,
    latitude: float,
    warning_m: float,
    timeout: float = 30,
) -> SnapResult:
    url = f"{base_url.rstrip('/')}/nearest/v1/driving/{longitude},{latitude}?number=1"
    with urlopen(url, timeout=timeout) as response:
        payload = json.load(response)
    if payload.get("code") != "Ok" or len(payload.get("waypoints", [])) != 1:
        raise RuntimeError("Incomplete OSRM nearest response")
    waypoint = payload["waypoints"][0]
    snapped_longitude, snapped_latitude = map(float, waypoint["location"])
    separation = float(waypoint["distance"])
    return SnapResult(
        longitude,
        latitude,
        snapped_longitude,
        snapped_latitude,
        separation,
        separation > warning_m,
    )


def table(
    base_url: str,
    sources: list[tuple[float, float]],
    destinations: list[tuple[float, float]],
    timeout: float = 60,
    retries: int = 3,
) -> list[list[int | None]]:
    """Return only road distances, avoiding generation and storage of durations."""
    coordinates = sources + destinations
    encoded_coordinates = ";".join(
        f"{longitude},{latitude}" for longitude, latitude in coordinates
    )
    query = urlencode(
        {
            "sources": ";".join(map(str, range(len(sources)))),
            "destinations": ";".join(
                map(str, range(len(sources), len(coordinates)))
            ),
            "annotations": "distance",
        }
    )
    for attempt in range(retries):
        try:
            url = (
                f"{base_url.rstrip('/')}/table/v1/driving/"
                f"{encoded_coordinates}?{query}"
            )
            with urlopen(url, timeout=timeout) as response:
                payload = json.load(response)
            if payload.get("code") != "Ok":
                raise RuntimeError(f"OSRM table error: {payload.get('code')}")
            matrix = payload.get("distances")
            if not isinstance(matrix, list) or len(matrix) != len(sources):
                raise RuntimeError("Incomplete OSRM table dimensions")
            if any(
                not isinstance(row, list) or len(row) != len(destinations)
                for row in matrix
            ):
                raise RuntimeError("Incomplete OSRM table dimensions")

            normalized: list[list[int | None]] = []
            for row_index, row in enumerate(matrix):
                normalized_row: list[int | None] = []
                for column_index, value in enumerate(row):
                    if value is None:
                        normalized_row.append(None)
                        continue
                    numeric = float(value)
                    if (
                        -1.0 <= numeric < 0
                        and coordinate_separation_m(
                            sources[row_index],
                            destinations[column_index],
                        )
                        <= 1.0
                    ):
                        numeric = 0.0
                    elif numeric < 0:
                        raise ValueError(
                            "Negative OSRM distance value "
                            f"{numeric!r} at row={row_index}, "
                            f"column={column_index}, "
                            f"source={sources[row_index]!r}, "
                            f"destination={destinations[column_index]!r}"
                        )
                    normalized_row.append(round_osrm(numeric))
                normalized.append(normalized_row)
            return normalized
        except (OSError, ValueError, RuntimeError, json.JSONDecodeError):
            if attempt + 1 == retries:
                raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")
