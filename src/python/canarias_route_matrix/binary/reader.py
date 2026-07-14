"""Defensive random-access CEDIST03 reader."""

from __future__ import annotations

from pathlib import Path

from ..errors import (
    CrossIslandRouteError,
    InvalidFormatError,
    UnknownCenterError,
    UnreachableRouteError,
)
from .format import (
    CURRENT_FORMAT,
    HEADER,
    HEADER_SIZE,
    INDEX,
    ISLAND,
    Distance,
    IndexEntry,
    IslandEntry,
)


class Reader:
    def __init__(self, path: Path):
        self.path = path
        self._stream = path.open("rb")
        self._size = path.stat().st_size
        values = HEADER.unpack(self._read(0, HEADER.size))
        (
            magic,
            major,
            _minor,
            header_size,
            flags,
            island_count,
            reserved,
            center_count,
            index_offset,
            directory_offset,
            file_size,
            reserved_bytes,
        ) = values
        if magic != CURRENT_FORMAT.magic or major != CURRENT_FORMAT.major:
            raise InvalidFormatError("Expected CEDIST03 format")
        if header_size != HEADER_SIZE or flags or reserved or any(reserved_bytes):
            raise InvalidFormatError("Invalid header fields")
        if file_size != self._size or index_offset != HEADER_SIZE:
            raise InvalidFormatError("Invalid file size or index offset")
        if directory_offset != index_offset + center_count * INDEX.size:
            raise InvalidFormatError("Invalid directory offset")

        self.center_count = center_count
        self.index_offset = index_offset
        self.islands: dict[int, IslandEntry] = {}
        matrix_start = directory_offset + island_count * ISLAND.size
        expected_offset = matrix_start
        for index in range(island_count):
            island_id, padding, count, distance_offset = ISLAND.unpack(
                self._read(directory_offset + index * ISLAND.size, ISLAND.size)
            )
            if any(padding) or count * count > (1 << 63) - 1:
                raise InvalidFormatError("Invalid island entry")
            matrix_end = distance_offset + count * count * CURRENT_FORMAT.cell_size
            if distance_offset != expected_offset or matrix_end > self._size:
                raise InvalidFormatError("Matrix offset outside file")
            self.islands[island_id] = IslandEntry(island_id, count, distance_offset)
            expected_offset = matrix_end
        if expected_offset != self._size:
            raise InvalidFormatError("Unexpected trailing data")

    def _read(self, offset: int, size: int) -> bytes:
        if offset < 0 or size < 0 or offset > self._size - size:
            raise InvalidFormatError("Truncated or out-of-range read")
        self._stream.seek(offset)
        data = self._stream.read(size)
        if len(data) != size:
            raise InvalidFormatError("Truncated file")
        return data

    def find(self, code: str) -> IndexEntry:
        if not code.isascii() or not code.isdigit() or len(code) != 8:
            raise UnknownCenterError(f"Invalid location code: {code}")
        target = int(code)
        low = 0
        high = self.center_count - 1
        while low <= high:
            middle = (low + high) // 2
            values = INDEX.unpack(
                self._read(self.index_offset + middle * INDEX.size, INDEX.size)
            )
            entry = IndexEntry(*values)
            if entry.code == target:
                island = self.islands.get(entry.island_id)
                if island is None or entry.local_index >= island.center_count:
                    raise InvalidFormatError("Index/island mismatch")
                return entry
            if entry.code < target:
                low = middle + 1
            else:
                high = middle - 1
        raise UnknownCenterError(f"Unknown location: {code}")

    def get_distance(self, origin: str, destination: str) -> Distance:
        source = self.find(origin)
        target = self.find(destination)
        if source.island_id != target.island_id:
            raise CrossIslandRouteError("Distances between islands are not computed")
        island = self.islands[source.island_id]
        position = source.local_index * island.center_count + target.local_index
        stored = CURRENT_FORMAT.distance_struct.unpack(
            self._read(
                island.distance_offset + position * CURRENT_FORMAT.cell_size,
                CURRENT_FORMAT.cell_size,
            )
        )[0]
        if stored == CURRENT_FORMAT.unreachable:
            raise UnreachableRouteError("Distance is unavailable")
        return Distance(stored * CURRENT_FORMAT.distance_unit_meters)

    def close(self) -> None:
        self._stream.close()

    def __enter__(self) -> "Reader":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
