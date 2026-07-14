"""Generate published data documentation from a verified manifest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return payload


def require_object(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise ValueError(f"Expected object at {key}")
    return value


def require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"Expected non-empty string at {key}")
    return value


def require_integer(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ValueError(f"Expected non-negative integer at {key}")
    return value


def inline_code(value: object) -> str:
    return f"`{str(value).replace('`', '')}`"


def generate_current_version(manifest: dict[str, Any]) -> str:
    format_info = require_object(manifest, "format")
    artifacts = require_object(manifest, "artifacts")
    matrix = require_object(artifacts, "canarias-distances.dat")
    centers = require_object(artifacts, "centers.min.json")
    major = require_integer(format_info, "major")
    minor = require_integer(format_info, "minor")
    matrix_sha256 = inline_code(require_string(matrix, "sha256"))
    centers_sha256 = inline_code(require_string(centers, "sha256"))

    lines = [
        "# Versión actual",
        "",
        "Esta página se genera automáticamente desde el manifiesto verificado "
        "de la release publicada.",
        "",
        f"- Versión de datos: {inline_code(require_string(manifest, 'data_version'))}",
        f"- Formato: {inline_code(require_string(format_info, 'magic'))}",
        f"- Versión del formato: {major}.{minor}",
    ]

    generated_at = manifest.get("generated_at")
    if isinstance(generated_at, str) and generated_at:
        lines.append(f"- Generado en UTC: {inline_code(generated_at)}")

    lines.extend(
        [
            f"- SHA-256 de `canarias-distances.dat`: {matrix_sha256}",
            f"- SHA-256 de `centers.min.json`: {centers_sha256}",
            "",
            "[Descargar el manifiesto publicado](../data/latest/manifest.json)",
            "",
        ]
    )
    return "\n".join(lines)


def generate_coverage(
    manifest: dict[str, Any],
    island_names: dict[str, Any],
) -> str:
    counts = require_object(manifest, "counts")
    islands = require_object(counts, "islands")

    lines = [
        "# Cobertura actual",
        "",
        "Estos recuentos se generan automáticamente desde el manifiesto verificado "
        "de la release publicada.",
        "",
        f"- Centros educativos: {require_integer(counts, 'centers')}",
        f"- Aeropuertos: {require_integer(counts, 'airports')}",
        f"- Puertos: {require_integer(counts, 'ports')}",
        f"- Ubicaciones totales: {require_integer(counts, 'locations')}",
        f"- Distancias dirigidas: {require_integer(counts, 'directed_distances')}",
        f"- Distancias no disponibles: {require_integer(counts, 'unreachable_distances')}",
        "",
        "| Isla | Ubicaciones |",
        "|---|---:|",
    ]

    for island_id in sorted(islands, key=int):
        name = island_names.get(island_id)
        count = islands[island_id]
        if not isinstance(name, str) or not name:
            raise ValueError(f"Unknown island id: {island_id}")
        if not isinstance(count, int) or isinstance(count, bool) or count < 0:
            raise ValueError(f"Invalid island count: {island_id}")
        lines.append(f"| {name.replace('_', ' ').title()} | {count} |")

    lines.extend(
        [
            "",
            "[Descargar el manifiesto publicado](../data/latest/manifest.json)",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--islands", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    manifest = load_object(args.manifest)
    island_names = load_object(args.islands)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "current-version.md").write_text(
        generate_current_version(manifest),
        encoding="utf-8",
    )
    (args.output / "coverage.md").write_text(
        generate_coverage(manifest, island_names),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
