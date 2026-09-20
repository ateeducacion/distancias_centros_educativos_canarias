"""Build production CEDIST04 distance artifacts from validated inputs and OSRM."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import gzip
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src/python"))

from canarias_route_matrix.binary.format import (  # noqa: E402
    CURRENT_FORMAT,
    MAX_DISTANCE_METERS,
)
from canarias_route_matrix.binary.writer import write_binary  # noqa: E402
from canarias_route_matrix.csv_importer import import_centers, write_report  # noqa: E402
from canarias_route_matrix.manifest import sha256, stable_json, write_checksums  # noqa: E402
from canarias_route_matrix.osrm import nearest, table  # noqa: E402
from canarias_route_matrix.transport_nodes import (  # noqa: E402
    load_transport_nodes,
    merge_locations,
)


def source_epoch_iso() -> str:
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", "0"))
    if epoch:
        return datetime.fromtimestamp(epoch, timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    cache = Path(os.environ.get("CACHE_DIR", ROOT / ".cache"))
    output = Path(os.environ.get("OUTPUT_DIR", ROOT / "dist"))
    osrm_url = os.environ.get("OSRM_URL", "http://127.0.0.1:5000")
    block_size = int(os.environ.get("BLOCK_SIZE", "50"))
    data_version = os.environ.get("DATA_VERSION", "development")
    output.mkdir(parents=True, exist_ok=True)

    overrides = [
        load_json(path)
        for path in sorted((ROOT / "config/overrides").glob("*.json"))
    ]
    result = import_centers(cache / "centers.csv", overrides=overrides)
    if result.errors:
        raise SystemExit(f"Official CSV has {len(result.errors)} rejected rows")

    education_centers = sorted(
        result.centers,
        key=lambda center: str(center["code"]),
    )
    transport_nodes_path = ROOT / "config/transport-nodes.json"
    routing_config = load_json(ROOT / "config/routing.json")
    profile_path = ROOT / str(routing_config["profile_path"])
    transport_nodes = load_transport_nodes(transport_nodes_path)
    locations = merge_locations(education_centers, transport_nodes)
    write_report(
        result,
        output / "validation-report.json",
        output / "validation-report.md",
    )

    def snap(location: dict[str, object]) -> tuple[str, dict[str, object]]:
        snapped = nearest(
            osrm_url,
            float(location["longitude"]),
            float(location["latitude"]),
            250.0,
        )
        if snapped.separation_m > 2000.0:
            raise RuntimeError(
                "Extreme snapping distance for "
                f"{location['code']}: {snapped.separation_m:.1f} m"
            )
        return str(location["code"]), {
            "official": [
                snapped.official_longitude,
                snapped.official_latitude,
            ],
            "snapped": [
                snapped.snapped_longitude,
                snapped.snapped_latitude,
            ],
            "separation_m": snapped.separation_m,
            "warning": snapped.warning,
        }

    with ThreadPoolExecutor(max_workers=8) as executor:
        snapping = dict(executor.map(snap, locations))
    stable_json(output / "snapping-report.json", snapping)

    matrices: dict[int, list[list[int | None]]] = {}
    unreachable = 0
    maximum_distance_meters = 0
    counts: dict[str, int] = {}
    island_ids = sorted({int(location["island_id"]) for location in locations})
    for island_id in island_ids:
        group = [
            location
            for location in locations
            if int(location["island_id"]) == island_id
        ]
        group.sort(key=lambda location: str(location["code"]))
        location_count = len(group)
        distances: list[list[int | None]] = [
            [None] * location_count for _ in range(location_count)
        ]
        for source_start in range(0, location_count, block_size):
            source_end = min(location_count, source_start + block_size)
            source_coordinates = [
                tuple(snapping[str(location["code"])]["snapped"])
                for location in group[source_start:source_end]
            ]
            for destination_start in range(0, location_count, block_size):
                destination_end = min(
                    location_count,
                    destination_start + block_size,
                )
                destination_coordinates = [
                    tuple(snapping[str(location["code"])]["snapped"])
                    for location in group[destination_start:destination_end]
                ]
                print(
                    f"island={island_id} "
                    f"sources={source_start}:{source_end} "
                    f"destinations={destination_start}:{destination_end}",
                    flush=True,
                )
                try:
                    distance_block = table(
                        osrm_url,
                        source_coordinates,
                        destination_coordinates,
                        timeout=120,
                        retries=3,
                    )
                except Exception as exc:
                    raise RuntimeError(
                        f"OSRM block failed for island={island_id}, "
                        f"sources={source_start}:{source_end}, "
                        f"destinations={destination_start}:{destination_end}: {exc}"
                    ) from exc
                for row_offset, row in enumerate(distance_block):
                    distances[source_start + row_offset][
                        destination_start:destination_end
                    ] = row

        for index in range(location_count):
            distances[index][index] = 0
        for row_index in range(location_count):
            for column_index in range(location_count):
                value = distances[row_index][column_index]
                if row_index != column_index and value == 0:
                    value = 1
                    distances[row_index][column_index] = value
                if value is not None:
                    maximum_distance_meters = max(maximum_distance_meters, value)

        if maximum_distance_meters > MAX_DISTANCE_METERS:
            raise RuntimeError(
                f"Generated distance {maximum_distance_meters} m exceeds the "
                f"CEDIST04 limit of {MAX_DISTANCE_METERS} m"
            )
        unreachable += sum(value is None for row in distances for value in row)
        matrices[island_id] = distances
        counts[str(island_id)] = location_count

    data_file = output / "canarias-distances.dat"
    write_binary(data_file, locations, matrices)

    # CEDIST04 keeps the on-disk matrix random-access but its byte planes make
    # it compressible. Publish a deterministic gzip copy so the browser (and any
    # bandwidth-sensitive consumer) downloads far fewer bytes and decompresses it
    # natively; local readers keep using the uncompressed .dat.
    data_gzip = output / "canarias-distances.dat.gz"
    data_gzip.write_bytes(
        gzip.compress(data_file.read_bytes(), compresslevel=9, mtime=0)
    )

    stable_json(output / "centers.json", locations)
    stable_json(output / "centers.min.json", locations, minified=True)

    centers_meta = load_json(cache / "centers.meta.json")
    osm_meta = load_json(cache / "osm.meta.json")
    transport_nodes_config = load_json(transport_nodes_path)
    stable_json(output / "transport-nodes.json", transport_nodes_config)

    artifact_paths = [
        data_file,
        data_gzip,
        output / "centers.json",
        output / "centers.min.json",
        output / "transport-nodes.json",
        output / "validation-report.json",
        output / "validation-report.md",
        output / "snapping-report.json",
    ]
    airport_count = sum(
        node["location_type"] == "AIRPORT" for node in transport_nodes
    )
    port_count = sum(node["location_type"] == "PORT" for node in transport_nodes)
    directed_distances = sum(value * value for value in counts.values())
    manifest = {
        "schema_version": 1,
        "format": {
            "magic": CURRENT_FORMAT.magic.decode("ascii"),
            "major": CURRENT_FORMAT.major,
            "minor": 0,
            "endianness": "little",
            "metric": "road_distance_meters",
            "storage_type": "uint16",
            "cell_size_bytes": CURRENT_FORMAT.cell_size,
            "distance_unit_meters": CURRENT_FORMAT.distance_unit_meters,
            "unreachable_value": CURRENT_FORMAT.unreachable,
            "maximum_distance_meters": MAX_DISTANCE_METERS,
            "rounding": "nearest decameter, halves up",
        },
        "generated_at": source_epoch_iso(),
        "data_version": data_version,
        "centers_source": {
            "dataset_url": (
                "https://datos.canarias.es/catalogos/general/"
                "dataset/centros-educativos-de-canarias"
            ),
            "resource_url": centers_meta["url"],
            "etag": centers_meta["etag"],
            "last_modified": centers_meta["last_modified"],
            "size": centers_meta["size"],
            "sha256": centers_meta["sha256"],
        },
        "transport_nodes_source": {
            "path": "config/transport-nodes.json",
            "sha256": sha256(transport_nodes_path),
            "scope": transport_nodes_config["scope"],
            "sources": transport_nodes_config["sources"],
        },
        "osm_source": {
            "url": osm_meta["url"],
            "etag": osm_meta["etag"],
            "last_modified": osm_meta["last_modified"],
            "size": osm_meta["size"],
            "sha256": osm_meta["sha256"],
        },
        "routing": {
            "engine": routing_config["engine"],
            "version": routing_config["version"],
            "docker_digest": routing_config["docker_digest"],
            "algorithm": routing_config["algorithm"],
            "profile": routing_config["profile"],
            "profile_sha256": sha256(profile_path),
            "profile_base": routing_config["profile_base"],
            "weight_name": routing_config["weight_name"],
            "annotations": ["distance"],
        },
        "rounding": "OSRM meters rounded to nearest decameter, halves up",
        "overrides": overrides,
        "counts": {
            "centers": len(education_centers),
            "locations": len(locations),
            "airports": airport_count,
            "ports": port_count,
            "directed_distances": directed_distances,
            "unreachable_distances": unreachable,
            "maximum_distance_meters": maximum_distance_meters,
            "islands": counts,
            "included": result.included,
            "excluded": result.excluded,
            "rejected": result.rejected,
        },
        "artifacts": {
            path.name: {
                "size": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in artifact_paths
        },
    }
    stable_json(output / "manifest.json", manifest)
    artifact_paths.append(output / "manifest.json")
    write_checksums(artifact_paths, output / "SHA256SUMS")
    print(json.dumps(manifest["counts"], sort_keys=True))


if __name__ == "__main__":
    main()
