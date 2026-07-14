"""Deterministic CEDIST03 writer."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
import os
from pathlib import Path
import tempfile

from .format import (
    CURRENT_FORMAT,
    HEADER,
    HEADER_SIZE,
    INDEX,
    ISLAND,
    MAX_DISTANCE_METERS,
    IndexEntry,
    IslandEntry,
)


def _value(value: int | None, diagonal: bool) -> int:
    if diagonal:
        return 0
    if value is None:
        return CURRENT_FORMAT.unreachable
    if value < 0:
        raise ValueError("Matrix value must not be negative")
    if value > MAX_DISTANCE_METERS:
        raise ValueError(
            f"Distance {value} m exceeds the CEDIST03 maximum of "
            f"{MAX_DISTANCE_METERS} m"
        )
    # Store nearest decametres, halves up. Keep non-diagonal distances
    # non-zero so zero remains an unambiguous diagonal value.
    return max(1, (value + 5) // CURRENT_FORMAT.distance_unit_meters)


def write_binary(
    path: Path,
    centers: Sequence[Mapping[str, object]],
    matrices: Mapping[int, Sequence[Sequence[int | None]]],
) -> None:
    """Write a CEDIST03 binary atomically, sorting islands and public codes."""
    ordered = sorted(centers, key=lambda center: int(str(center["code"])))
    metadata_indexes = {str(center["code"]): index for index, center in enumerate(ordered)}
    by_island: dict[int, list[Mapping[str, object]]] = {}
    for center in ordered:
        by_island.setdefault(int(center["island_id"]), []).append(center)

    entries: list[IndexEntry] = []
    for island_id, group in by_island.items():
        group.sort(key=lambda center: int(str(center["code"])))
        for local_index, center in enumerate(group):
            code = str(center["code"])
            entries.append(
                IndexEntry(
                    int(code),
                    island_id,
                    0,
                    local_index,
                    metadata_indexes[code],
                )
            )
    entries.sort(key=lambda entry: entry.code)

    directory_offset = HEADER_SIZE + len(entries) * INDEX.size
    cursor = directory_offset + len(by_island) * ISLAND.size
    islands: list[IslandEntry] = []
    for island_id, group in sorted(by_island.items()):
        count = len(group)
        islands.append(IslandEntry(island_id, count, cursor))
        cursor += count * count * CURRENT_FORMAT.cell_size

    path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(file_descriptor, "wb") as stream:
            stream.write(
                HEADER.pack(
                    CURRENT_FORMAT.magic,
                    CURRENT_FORMAT.major,
                    0,
                    HEADER_SIZE,
                    0,
                    len(islands),
                    0,
                    len(entries),
                    HEADER_SIZE,
                    directory_offset,
                    cursor,
                    b"\0" * 12,
                )
            )
            for entry in entries:
                stream.write(
                    INDEX.pack(
                        entry.code,
                        entry.island_id,
                        entry.flags,
                        entry.local_index,
                        entry.metadata_index,
                    )
                )
            for entry in islands:
                stream.write(
                    ISLAND.pack(
                        entry.island_id,
                        b"\0" * 3,
                        entry.center_count,
                        entry.distance_offset,
                    )
                )
            for entry in islands:
                distance = matrices[entry.island_id]
                if len(distance) != entry.center_count:
                    raise ValueError("Invalid matrix dimensions")
                for row_index, row in enumerate(distance):
                    if len(row) != entry.center_count:
                        raise ValueError("Invalid matrix dimensions")
                    for column_index, value in enumerate(row):
                        stream.write(
                            CURRENT_FORMAT.distance_struct.pack(
                                _value(value, row_index == column_index)
                            )
                        )
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise
