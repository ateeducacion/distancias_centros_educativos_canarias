"""Deterministic CEDIST02 distance-only writer."""
from __future__ import annotations

from collections.abc import Mapping, Sequence
import os
from pathlib import Path
import struct
import tempfile

from .format import (
    HEADER,
    HEADER_SIZE,
    INDEX,
    ISLAND,
    IndexEntry,
    IslandEntry,
    MAGIC,
    MAJOR,
    MINOR,
    UNREACHABLE,
)


def _value(value: int | None, diagonal: bool) -> int:
    if diagonal:
        return 0
    if value is None:
        return UNREACHABLE
    if value < 0 or value >= UNREACHABLE:
        raise ValueError("Matrix value is outside uint32 range")
    return value


def write_binary(
    path: Path,
    centers: Sequence[Mapping[str, object]],
    matrices: Mapping[int, Sequence[Sequence[int | None]]],
) -> None:
    """Write a distance-only binary atomically, sorting islands and public codes."""
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
        cursor += count * count * 4

    path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(file_descriptor, "wb") as stream:
            stream.write(
                HEADER.pack(
                    MAGIC,
                    MAJOR,
                    MINOR,
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
                            struct.pack(
                                "<I",
                                _value(value, row_index == column_index),
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
