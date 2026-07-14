"""CEDIST02 and CEDIST03 binary structures."""

from dataclasses import dataclass
import struct

HEADER_SIZE = 64
INDEX_SIZE = 12
ISLAND_SIZE = 16
HEADER = struct.Struct("<8sHHIIHHIQQQ12s")
INDEX = struct.Struct("<IBBHI")
ISLAND = struct.Struct("<B3sIQ")


@dataclass(frozen=True)
class FormatSpec:
    """Version-specific distance cell encoding."""

    magic: bytes
    major: int
    cell_size: int
    distance_unit_meters: int
    unreachable: int
    distance_struct: struct.Struct


CEDIST02 = FormatSpec(
    magic=b"CEDIST02",
    major=2,
    cell_size=4,
    distance_unit_meters=1,
    unreachable=0xFFFFFFFF,
    distance_struct=struct.Struct("<I"),
)
CEDIST03 = FormatSpec(
    magic=b"CEDIST03",
    major=3,
    cell_size=2,
    distance_unit_meters=10,
    unreachable=0xFFFF,
    distance_struct=struct.Struct("<H"),
)
FORMATS = {CEDIST02.major: CEDIST02, CEDIST03.major: CEDIST03}
CURRENT_FORMAT = CEDIST03
MAGIC = CURRENT_FORMAT.magic
MAJOR = CURRENT_FORMAT.major
MINOR = 0
MAX_DISTANCE_METERS = (CEDIST03.unreachable - 1) * CEDIST03.distance_unit_meters


def get_format(magic: bytes, major: int) -> FormatSpec | None:
    """Return a supported format only when magic and major agree."""
    candidate = FORMATS.get(major)
    if candidate is None or candidate.magic != magic:
        return None
    return candidate


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
