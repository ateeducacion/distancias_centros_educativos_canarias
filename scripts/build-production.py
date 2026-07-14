"""Build production CEDIST01 artifacts from validated official inputs and local OSRM."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src/python"))

from canarias_route_matrix.binary.writer import write_binary  # noqa: E402
from canarias_route_matrix.csv_importer import import_centers, write_report  # noqa: E402
from canarias_route_matrix.manifest import sha256, stable_json, write_checksums  # noqa: E402
from canarias_route_matrix.osrm import nearest, table  # noqa: E402
from canarias_route_matrix.transport_nodes import load_transport_nodes, merge_locations  # noqa: E402


def source_epoch_iso() -> str:
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", "0"))
    if epoch:
        return datetime.fromtimestamp(epoch, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    cache = Path(os.environ.get("CACHE_DIR", ROOT / ".cache"))
    output = Path(os.environ.get("OUTPUT_DIR", ROOT / "dist"))
    osrm_url = os.environ.get("OSRM_URL", "http://127.0.0.1:5000")
    block_size = int(os.environ.get("BLOCK_SIZE", "50"))
    output.mkdir(parents=True, exist_ok=True)
    overrides = [load_json(path) for path in sorted((ROOT / "config/overrides").glob("*.json"))]
    result = import_centers(cache / "centers.csv", overrides=overrides)
    if result.errors:
        raise SystemExit(f"Official CSV has {len(result.errors)} rejected rows")
    education_centers = sorted(result.centers, key=lambda center: str(center["code"]))
    transport_nodes_path = ROOT / "config/transport-nodes.json"
    transport_nodes = load_transport_nodes(transport_nodes_path)
    centers = merge_locations(education_centers, transport_nodes)
    write_report(result, output / "validation-report.json", output / "validation-report.md")

    def snap(center: dict[str, object]) -> tuple[str, dict[str, object]]:
        snapped = nearest(osrm_url, float(center["longitude"]), float(center["latitude"]), 250.0)
        if snapped.separation_m > 2000.0:
            raise RuntimeError(f"Extreme snapping distance for {center['code']}: {snapped.separation_m:.1f} m")
        return str(center["code"]), {
            "official": [snapped.official_longitude, snapped.official_latitude],
            "snapped": [snapped.snapped_longitude, snapped.snapped_latitude],
            "separation_m": snapped.separation_m,
            "warning": snapped.warning,
        }

    with ThreadPoolExecutor(max_workers=8) as executor:
        snapping = dict(executor.map(snap, centers))
    stable_json(output / "snapping-report.json", snapping)

    matrices: dict[int, tuple[list[list[int | None]], list[list[int | None]]]] = {}
    unreachable = 0
    counts: dict[str, int] = {}
    for island_id in sorted({int(center["island_id"]) for center in centers}):
        group = [center for center in centers if int(center["island_id"]) == island_id]
        group.sort(key=lambda center: str(center["code"]))
        n = len(group)
        distances: list[list[int | None]] = [[None] * n for _ in range(n)]
        durations: list[list[int | None]] = [[None] * n for _ in range(n)]
        for source_start in range(0, n, block_size):
            source_end = min(n, source_start + block_size)
            source_coords = [tuple(snapping[str(center["code"])] ["snapped"]) for center in group[source_start:source_end]]
            for destination_start in range(0, n, block_size):
                destination_end = min(n, destination_start + block_size)
                destination_coords = [tuple(snapping[str(center["code"])] ["snapped"]) for center in group[destination_start:destination_end]]
                print(f"island={island_id} sources={source_start}:{source_end} destinations={destination_start}:{destination_end}", flush=True)
                try:
                    distance_block, duration_block = table(osrm_url, source_coords, destination_coords, timeout=120, retries=3)
                except Exception as exc:
                    raise RuntimeError(f"OSRM block failed for island={island_id}, sources={source_start}:{source_end}, destinations={destination_start}:{destination_end}: {exc}") from exc
                for row_offset, row in enumerate(distance_block):
                    distances[source_start + row_offset][destination_start:destination_end] = row
                for row_offset, row in enumerate(duration_block):
                    durations[source_start + row_offset][destination_start:destination_end] = row
        for index in range(n):
            distances[index][index] = 0
            durations[index][index] = 0
        for row_index in range(n):
            for column_index in range(n):
                if row_index != column_index:
                    if distances[row_index][column_index] == 0: distances[row_index][column_index] = 1
                    if durations[row_index][column_index] == 0: durations[row_index][column_index] = 1
        unreachable += sum(value is None for row in distances for value in row)
        matrices[island_id] = distances, durations
        counts[str(island_id)] = n

    binary = output / "canarias-education-routes.bin"
    write_binary(binary, centers, matrices)
    subprocess.run(["zstd", "-19", "--force", str(binary), "-o", str(binary) + ".zst"], check=True)
    stable_json(output / "centers.json", centers)
    stable_json(output / "centers.min.json", centers, minified=True)
    centers_meta = load_json(cache / "centers.meta.json")
    osm_meta = load_json(cache / "osm.meta.json")
    transport_nodes_config = load_json(transport_nodes_path)
    stable_json(output / "transport-nodes.json", transport_nodes_config)
    profile_sha = "cb3df0546318665609606b746a1297f3d65ca3c2ff825f8a6f3c57247d86a2d3"
    docker_digest = "sha256:855614a38f464b0558a2ad6eaa7cb8c139f39887da9b38b485ce453c6e6e6124"
    artifact_paths = [binary, Path(str(binary) + ".zst"), output / "centers.json", output / "centers.min.json", output / "transport-nodes.json", output / "validation-report.json", output / "validation-report.md", output / "snapping-report.json"]
    airport_count = sum(node["location_type"] == "AIRPORT" for node in transport_nodes)
    port_count = sum(node["location_type"] == "PORT" for node in transport_nodes)
    manifest = {
        "schema_version": 1,
        "format": {"magic": "CEDIST01", "major": 1, "minor": 0, "endianness": "little"},
        "generated_at": source_epoch_iso(),
        "data_version": "v0.0.3",
        "centers_source": {"dataset_url": "https://datos.canarias.es/catalogos/general/dataset/centros-educativos-de-canarias", "resource_url": centers_meta["url"], "etag": centers_meta["etag"], "last_modified": centers_meta["last_modified"], "size": centers_meta["size"], "sha256": centers_meta["sha256"]},
        "transport_nodes_source": {"path": "config/transport-nodes.json", "sha256": sha256(transport_nodes_path), "scope": transport_nodes_config["scope"], "sources": transport_nodes_config["sources"]},
        "osm_source": {"url": osm_meta["url"], "etag": osm_meta["etag"], "last_modified": osm_meta["last_modified"], "size": osm_meta["size"], "sha256": osm_meta["sha256"]},
        "routing": {"engine": "OSRM", "version": "5.27.1", "docker_digest": docker_digest, "algorithm": "MLD", "profile": "car-fastest", "profile_sha256": profile_sha},
        "rounding": "nearest integer, halves up",
        "overrides": overrides,
        "counts": {"centers": len(education_centers), "locations": len(centers), "airports": airport_count, "ports": port_count, "directed_routes": sum(value * value for value in counts.values()), "unreachable_routes": unreachable, "islands": counts, "included": result.included, "excluded": result.excluded, "rejected": result.rejected},
        "artifacts": {path.name: {"size": path.stat().st_size, "sha256": sha256(path)} for path in artifact_paths},
    }
    stable_json(output / "manifest.json", manifest)
    artifact_paths.append(output / "manifest.json")
    write_checksums(artifact_paths, output / "SHA256SUMS")
    print(json.dumps(manifest["counts"], sort_keys=True))


if __name__ == "__main__":
    main()
