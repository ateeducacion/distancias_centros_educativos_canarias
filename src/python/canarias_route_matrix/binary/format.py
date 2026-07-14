"""CEDIST02 distance-only binary structures."""

from dataclasses import dataclass
import struct

MAGIC = b"CEDIST02"
MAJOR = 2
MINOR = 0
HEADER_SIZE = 64
INDEX_SIZE = 12
ISLAND_SIZE = 16
UNREACHABLE = 0xFFFFFFFF

HEADER = struct.Struct("<8sHHIIHHIQQQ12s")
INDEX = struct.Struct("<IBBHI")
ISLAND = struct.Struct("<B3sIQ")


@dataclass(frozen=True)
class IndexEntry:
    code: int
    island_id: int
    flags: int
    local_index: int
    metadata_index: int


@dataclass(frozen=True)
class IslandEntry:
    island_id: int
    center_count: int
    distance_offset: int


@dataclass(frozen=True)
class Distance:
    distance_meters: int


Route = Distance
