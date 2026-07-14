"""CEDIST01 binary structures."""

from dataclasses import dataclass
import struct

MAGIC=b"CEDIST01"; MAJOR=1; MINOR=0; HEADER_SIZE=64; INDEX_SIZE=12; ISLAND_SIZE=24; UNREACHABLE=0xFFFFFFFF
HEADER=struct.Struct("<8sHHIIHHIQQQ12s")
INDEX=struct.Struct("<IBBHI")
ISLAND=struct.Struct("<B3sIQQ")

@dataclass(frozen=True)
class IndexEntry:
    code: int; island_id: int; flags: int; local_index: int; metadata_index: int

@dataclass(frozen=True)
class IslandEntry:
    island_id: int; center_count: int; distance_offset: int; duration_offset: int

@dataclass(frozen=True)
class Route:
    distance_meters: int; duration_seconds: int
