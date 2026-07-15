"""CEDIST04 binary structures.

CEDIST04 keeps every CEDIST03 header/index/directory field and offset, and the
same per-island block size (``count * count * cell_size`` bytes). The only
change is the *layout inside each island block*: instead of interleaved
little-endian ``uint16`` cells, the block stores a byte plane of all low bytes
(``count * count`` of them, row-major) followed by a byte plane of all high
bytes. Splitting the noisy low byte from the structured high byte is what makes
the matrix compress (generic zstd/gzip cannot compress the interleaved form).

Cell ``(i, j)`` at ``pos = i * count + j`` decodes as
``low[pos] | (high[pos] << 8)`` where ``high`` starts ``count * count`` bytes
after ``low``. Random access stays O(1) (two 1-byte reads).
"""

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
    """CEDIST04 distance cell encoding."""

    magic: bytes
    major: int
    cell_size: int
    distance_unit_meters: int
    unreachable: int
    distance_struct: struct.Struct


CURRENT_FORMAT = FormatSpec(
    magic=b"CEDIST04",
    major=4,
    cell_size=2,
    distance_unit_meters=10,
    unreachable=0xFFFF,
    distance_struct=struct.Struct("<H"),
)
MAGIC = CURRENT_FORMAT.magic
MAJOR = CURRENT_FORMAT.major
MINOR = 0
MAX_DISTANCE_METERS = (
    CURRENT_FORMAT.unreachable - 1
) * CURRENT_FORMAT.distance_unit_meters


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
