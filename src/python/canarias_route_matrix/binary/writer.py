"""Deterministic CEDIST04 writer."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import TYPE_CHECKING

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

if TYPE_CHECKING:
    # Only referenced from string annotations (``from __future__ import
    # annotations``), so it never evaluates the union at runtime.
    Matrix = Sequence[Sequence[int | None]]


def _value(value: int | None, diagonal: bool) -> int:
    if diagonal:
        return 0
    if value is None:
        return CURRENT_FORMAT.unreachable
    if value < 0:
        raise ValueError("Matrix value must not be negative")
    if value > MAX_DISTANCE_METERS:
        raise ValueError(
            f"Distance {value} m exceeds the CEDIST04 maximum of "
            f"{MAX_DISTANCE_METERS} m"
        )
    # Store nearest decametres, halves up. Keep non-diagonal distances
    # non-zero so zero remains an unambiguous diagonal value.
    return max(1, (value + 5) // CURRENT_FORMAT.distance_unit_meters)


def _nearest_neighbour_order(matrix: Matrix) -> list[int]:
    """Return a permutation ``perm`` (``perm[new] = old``) that visits centres in
    a greedy nearest-neighbour tour.

    Reordering the local indices so neighbouring rows/columns hold similar
    distances markedly improves compression, and is fully lossless: callers look
    centres up by public code through the global index, never by position. The
    tour is deterministic (starts at local index 0, ties resolved by lowest
    index), so builds stay reproducible.
    """
    count = len(matrix)
    if count <= 2:
        return list(range(count))
    infinity = float("inf")
    visited = [False] * count
    order = [0]
    visited[0] = True
    current = 0
    for _ in range(count - 1):
        best = -1
        best_distance = infinity
        row = matrix[current]
        for candidate in range(count):
            if visited[candidate]:
                continue
            forward = row[candidate]
            backward = matrix[candidate][current]
            distance = (infinity if forward is None else forward) + (
                infinity if backward is None else backward
            )
            if distance < best_distance:
                best_distance = distance
                best = candidate
        if best == -1:  # remaining centres are mutually unreachable
            order.extend(k for k in range(count) if not visited[k])
            break
        order.append(best)
        visited[best] = True
        current = best
    return order


def _reorder(matrix: Matrix, order: Sequence[int]) -> list[list[int | None]]:
    return [[matrix[old_row][old_col] for old_col in order] for old_row in order]


def write_binary(
    path: Path,
    centers: Sequence[Mapping[str, object]],
    matrices: Mapping[int, Matrix],
) -> None:
    """Write a CEDIST04 binary atomically.

    Islands are ordered by id and the global index is sorted by public code (so
    binary search still works). Within each island, local indices are assigned by
    a nearest-neighbour tour and the matrix is stored as two byte planes (all low
    bytes, then all high bytes) to make the file compressible.
    """
    ordered = sorted(centers, key=lambda center: int(str(center["code"])))
    metadata_indexes = {str(center["code"]): index for index, center in enumerate(ordered)}
    by_island: dict[int, list[Mapping[str, object]]] = {}
    for center in ordered:
        by_island.setdefault(int(center["island_id"]), []).append(center)

    # Per island: assign local indices from a nearest-neighbour tour and reorder
    # the matrix to match, so on-disk rows/columns are in tour order.
    local_indexes: dict[tuple[int, str], int] = {}
    reordered: dict[int, list[list[int | None]]] = {}
    for island_id, group in by_island.items():
        group.sort(key=lambda center: int(str(center["code"])))
        matrix = matrices[island_id]
        if len(matrix) != len(group):
            raise ValueError("Invalid matrix dimensions")
        order = _nearest_neighbour_order(matrix)
        reordered[island_id] = _reorder(matrix, order)
        for new_index, old_index in enumerate(order):
            code = str(group[old_index]["code"])
            local_indexes[(island_id, code)] = new_index

    entries: list[IndexEntry] = []
    for island_id, group in by_island.items():
        for center in group:
            code = str(center["code"])
            entries.append(
                IndexEntry(
                    int(code),
                    island_id,
                    0,
                    local_indexes[(island_id, code)],
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
            for island in islands:
                stream.write(
                    ISLAND.pack(
                        island.island_id,
                        b"\0" * 3,
                        island.center_count,
                        island.distance_offset,
                    )
                )
            for island in islands:
                distance = reordered[island.island_id]
                count = island.center_count
                low_plane = bytearray(count * count)
                high_plane = bytearray(count * count)
                for row_index, row in enumerate(distance):
                    if len(row) != count:
                        raise ValueError("Invalid matrix dimensions")
                    base = row_index * count
                    for column_index, value in enumerate(row):
                        stored = _value(value, row_index == column_index)
                        position = base + column_index
                        low_plane[position] = stored & 0xFF
                        high_plane[position] = (stored >> 8) & 0xFF
                stream.write(low_plane)
                stream.write(high_plane)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise
