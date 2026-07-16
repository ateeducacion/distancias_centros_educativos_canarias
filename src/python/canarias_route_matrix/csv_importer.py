"""Strict UTF-8 CSV validation and privacy-preserving normalization."""

from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import re

from .additional_centers import load_additional_centers
from .errors import ValidationError
from .islands import normalize_island

REQUIRED = {
    "Codigo",
    "Denominacion",
    "Direccion",
    "Localidad",
    "Municipio",
    "Isla",
    "Provincia",
    "Naturaleza",
    "TipoCentro",
    "Longitud",
    "Latitud",
}


@dataclass(frozen=True)
class ImportResult:
    """Normalized centers and validation counters."""

    centers: list[dict[str, object]]
    errors: list[dict[str, object]]
    warnings: list[dict[str, object]]
    included: int
    excluded: int
    rejected: int


def import_centers(
    path: Path,
    code_pattern: str = r"^[0-9]{8}$",
    include_types: set[str] | None = None,
    include_natures: set[str] | None = None,
    overrides: list[dict[str, object]] | None = None,
    additional_centers_path: Path | None = None,
) -> ImportResult:
    """Import official centers and append versioned non-teaching services."""
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValidationError(f"CSV is not valid UTF-8: {exc}") from exc

    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error as exc:
        raise ValidationError("CSV delimiter could not be detected") from exc

    reader = csv.DictReader(text.splitlines(), dialect=dialect)
    headers = set(reader.fieldnames or [])
    if missing := REQUIRED - headers:
        raise ValidationError(
            f"CSV schema changed; missing columns: {sorted(missing)}"
        )

    centers: list[dict[str, object]] = []
    errors: list[dict[str, object]] = []
    warnings: list[dict[str, object]] = []
    seen: set[str] = set()
    excluded = 0
    override_map = {
        (str(item["center_code"]), str(item["field"])): item
        for item in (overrides or [])
    }

    for line, row in enumerate(reader, start=2):
        cleaned = {
            key: value.strip() if value is not None else ""
            for key, value in row.items()
        }
        code = cleaned["Codigo"]
        for csv_field in ("Longitud", "Latitud"):
            override = override_map.get((code, csv_field))
            if override is not None:
                if cleaned[csv_field] != str(override["old_value"]):
                    raise ValidationError(
                        f"Override old_value mismatch for {code} {csv_field}"
                    )
                cleaned[csv_field] = str(override["new_value"])
                warnings.append(
                    {
                        "line": line,
                        "code": code,
                        "warning": "override_applied",
                        "field": csv_field,
                    }
                )

        row_errors: list[str] = []
        if not code:
            row_errors.append("missing_code")
        elif not re.fullmatch(code_pattern, code):
            row_errors.append("invalid_code_format")
        elif code in seen:
            row_errors.append("duplicate_code")
        seen.add(code)

        try:
            longitude = float(cleaned["Longitud"])
            latitude = float(cleaned["Latitud"])
        except ValueError:
            longitude = latitude = 0
            row_errors.append("invalid_coordinates")

        if not row_errors and (
            not -180 <= longitude <= 180 or not -90 <= latitude <= 90
        ):
            row_errors.append("coordinates_out_of_range")
        if not row_errors and not (
            -19 <= longitude <= -13 and 27 <= latitude <= 30
        ):
            row_errors.append("coordinates_outside_canary_bounds")

        try:
            island_id, island = normalize_island(cleaned["Isla"])
        except ValueError:
            island_id = 0
            island = ""
            row_errors.append("unknown_island")

        if row_errors:
            errors.append(
                {
                    "line": line,
                    "code": code or None,
                    "errors": row_errors,
                }
            )
            continue

        if (
            include_types and cleaned["TipoCentro"] not in include_types
        ) or (
            include_natures and cleaned["Naturaleza"] not in include_natures
        ):
            excluded += 1
            continue

        centers.append(
            {
                "code": code,
                "name": cleaned["Denominacion"],
                "island": island,
                "island_id": island_id,
                "municipality": cleaned["Municipio"],
                "locality": cleaned["Localidad"],
                "address": cleaned["Direccion"],
                "postal_code": cleaned.get(
                    "CodigoPostal",
                    cleaned.get("CP", ""),
                ),
                "longitude": longitude,
                "latitude": latitude,
                "nature": cleaned["Naturaleza"],
                "center_type": cleaned["TipoCentro"],
            }
        )

    if additional_centers_path is None:
        candidate = path.parent.parent / "config" / "additional-centers.csv"
        if candidate.exists():
            additional_centers_path = candidate

    if additional_centers_path is not None:
        additional_centers = load_additional_centers(
            additional_centers_path,
            centers,
            code_pattern,
        )
        for center in additional_centers:
            if (
                include_types
                and str(center["center_type"]) not in include_types
            ) or (
                include_natures
                and str(center["nature"]) not in include_natures
            ):
                excluded += 1
                continue
            centers.append(center)

    return ImportResult(
        centers,
        errors,
        warnings,
        len(centers),
        excluded,
        len(errors),
    )


def write_report(
    result: ImportResult,
    json_path: Path,
    markdown_path: Path,
) -> None:
    """Write machine-readable and Markdown validation reports."""
    payload = {
        key: value
        for key, value in asdict(result).items()
        if key != "centers"
    }
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    markdown_path.write_text(
        "# Informe de validación\n\n"
        f"- Incluidos: {result.included}\n"
        f"- Excluidos: {result.excluded}\n"
        f"- Rechazados: {result.rejected}\n"
        f"- Advertencias: {len(result.warnings)}\n\n"
        + "\n".join(
            f"- Fila {error['line']}: {', '.join(error['errors'])}"
            for error in result.errors
        )
        + "\n",
        encoding="utf-8",
    )
