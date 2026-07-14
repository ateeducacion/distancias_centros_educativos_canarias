"""Defensive random-access CEDIST01 reader."""
from __future__ import annotations

from pathlib import Path
import struct
from .format import HEADER, INDEX, ISLAND, HEADER_SIZE, MAGIC, MAJOR, UNREACHABLE, IndexEntry, IslandEntry, Route
from ..errors import CrossIslandRouteError, InvalidFormatError, UnknownCenterError, UnreachableRouteError

class Reader:
    def __init__(self,path:Path):
        self.path=path; self._stream=path.open("rb"); self._size=path.stat().st_size
        raw=self._read(0,HEADER.size); values=HEADER.unpack(raw)
        magic,major,minor,header_size,flags,island_count,reserved,center_count,index_offset,directory_offset,file_size,reserved_bytes=values
        if magic!=MAGIC: raise InvalidFormatError("Unknown magic")
        if major>MAJOR: raise InvalidFormatError("Unsupported major version")
        if header_size!=HEADER_SIZE or flags or reserved or any(reserved_bytes): raise InvalidFormatError("Invalid header fields")
        if file_size!=self._size or index_offset!=HEADER_SIZE: raise InvalidFormatError("Invalid file size or index offset")
        if directory_offset != index_offset+center_count*INDEX.size: raise InvalidFormatError("Invalid directory offset")
        self.center_count=center_count; self.index_offset=index_offset; self.islands={}
        for i in range(island_count):
            island_id,pad,n,distance,duration=ISLAND.unpack(self._read(directory_offset+i*ISLAND.size,ISLAND.size))
            if any(pad) or n*n > (1<<63)-1: raise InvalidFormatError("Invalid island entry")
            end=duration+n*n*4
            if distance < directory_offset+island_count*ISLAND.size or duration != distance+n*n*4 or end>self._size: raise InvalidFormatError("Matrix offset outside file")
            self.islands[island_id]=IslandEntry(island_id,n,distance,duration)
    def _read(self,offset:int,size:int)->bytes:
        if offset<0 or size<0 or offset>self._size-size: raise InvalidFormatError("Truncated or out-of-range read")
        self._stream.seek(offset); data=self._stream.read(size)
        if len(data)!=size: raise InvalidFormatError("Truncated file")
        return data
    def find(self,code:str)->IndexEntry:
        if not code.isascii() or not code.isdigit() or len(code)!=8: raise UnknownCenterError(f"Invalid center code: {code}")
        target=int(code); low=0; high=self.center_count-1
        while low<=high:
            mid=(low+high)//2; values=INDEX.unpack(self._read(self.index_offset+mid*INDEX.size,INDEX.size)); entry=IndexEntry(*values)
            if entry.code==target:
                island=self.islands.get(entry.island_id)
                if island is None or entry.local_index>=island.center_count: raise InvalidFormatError("Index/island mismatch")
                return entry
            if entry.code<target: low=mid+1
            else: high=mid-1
        raise UnknownCenterError(f"Unknown center: {code}")
    def get_route(self,origin:str,destination:str)->Route:
        source=self.find(origin); target=self.find(destination)
        if source.island_id!=target.island_id: raise CrossIslandRouteError("Routes between islands are not computed")
        island=self.islands[source.island_id]; position=source.local_index*island.center_count+target.local_index
        distance=struct.unpack("<I",self._read(island.distance_offset+position*4,4))[0]
        duration=struct.unpack("<I",self._read(island.duration_offset+position*4,4))[0]
        if distance==UNREACHABLE or duration==UNREACHABLE: raise UnreachableRouteError("Route is unavailable")
        return Route(distance,duration)
    def close(self)->None: self._stream.close()
    def __enter__(self)->"Reader": return self
    def __exit__(self,*args:object)->None: self.close()
