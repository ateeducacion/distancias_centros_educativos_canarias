"""Deterministic CEDIST01 writer."""
from __future__ import annotations

from pathlib import Path
import os, struct, tempfile
from collections.abc import Mapping, Sequence
from .format import HEADER, INDEX, ISLAND, HEADER_SIZE, IndexEntry, IslandEntry, MAGIC, MAJOR, MINOR, UNREACHABLE

def _value(value: int | None, diagonal: bool) -> int:
    if diagonal: return 0
    if value is None: return UNREACHABLE
    if value < 0 or value >= UNREACHABLE: raise ValueError("Matrix value is outside uint32 range")
    return value

def write_binary(path: Path, centers: Sequence[Mapping[str, object]], matrices: Mapping[int, tuple[Sequence[Sequence[int | None]], Sequence[Sequence[int | None]]]]) -> None:
    """Write a binary atomically, sorting islands and public codes."""
    ordered = sorted(centers, key=lambda c: int(str(c["code"])))
    by_island: dict[int,list[Mapping[str,object]]] = {}
    for center in ordered: by_island.setdefault(int(center["island_id"]), []).append(center)
    entries=[]
    for island_id, group in by_island.items():
        group.sort(key=lambda c:int(str(c["code"])))
        for local, center in enumerate(group): entries.append(IndexEntry(int(str(center["code"])),island_id,0,local,ordered.index(center)))
    entries.sort(key=lambda e:e.code)
    directory_offset=HEADER_SIZE+len(entries)*INDEX.size
    cursor=directory_offset+len(by_island)*ISLAND.size
    islands=[]
    for island_id, group in sorted(by_island.items()):
        n=len(group); distance_offset=cursor; cursor += n*n*4; duration_offset=cursor; cursor += n*n*4
        islands.append(IslandEntry(island_id,n,distance_offset,duration_offset))
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=f".{path.name}.",dir=path.parent)
    try:
        with os.fdopen(fd,"wb") as stream:
            stream.write(HEADER.pack(MAGIC,MAJOR,MINOR,HEADER_SIZE,0,len(islands),0,len(entries),HEADER_SIZE,directory_offset,cursor,b"\0"*12))
            for e in entries: stream.write(INDEX.pack(e.code,e.island_id,e.flags,e.local_index,e.metadata_index))
            for e in islands: stream.write(ISLAND.pack(e.island_id,b"\0"*3,e.center_count,e.distance_offset,e.duration_offset))
            for e in islands:
                distance,duration=matrices[e.island_id]
                if len(distance)!=e.center_count or len(duration)!=e.center_count: raise ValueError("Invalid matrix dimensions")
                for matrix in (distance,duration):
                    for row_index,row in enumerate(matrix):
                        if len(row)!=e.center_count: raise ValueError("Invalid matrix dimensions")
                        for column_index,value in enumerate(row): stream.write(struct.pack("<I",_value(value,row_index==column_index)))
            stream.flush(); os.fsync(stream.fileno())
        os.replace(tmp,path)
    except BaseException:
        try: os.unlink(tmp)
        except FileNotFoundError: pass
        raise
