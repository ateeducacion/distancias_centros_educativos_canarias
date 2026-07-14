"""OSRM nearest and table client with validation."""
from __future__ import annotations
from dataclasses import dataclass
import json,math,time
from urllib.parse import urlencode
from urllib.request import urlopen

@dataclass(frozen=True)
class SnapResult: official_longitude:float; official_latitude:float; snapped_longitude:float; snapped_latitude:float; separation_m:float; warning:bool
def round_osrm(value:float)->int:
    if not math.isfinite(value) or value<0: raise ValueError(f"OSRM value must be finite and non-negative, got {value!r}")
    return math.floor(value+0.5)

def coordinate_separation_m(source:tuple[float,float],destination:tuple[float,float])->float:
    lon1,lat1=map(math.radians,source);lon2,lat2=map(math.radians,destination)
    dlon=lon2-lon1;dlat=lat2-lat1
    value=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6371000*2*math.asin(math.sqrt(value))
def nearest(base_url:str,longitude:float,latitude:float,warning_m:float,timeout:float=30)->SnapResult:
    with urlopen(f"{base_url.rstrip('/')}/nearest/v1/driving/{longitude},{latitude}?number=1",timeout=timeout) as response: payload=json.load(response)
    if payload.get("code")!="Ok" or len(payload.get("waypoints",[]))!=1: raise RuntimeError("Incomplete OSRM nearest response")
    waypoint=payload["waypoints"][0];lon,lat=map(float,waypoint["location"]);separation=float(waypoint["distance"])
    return SnapResult(longitude,latitude,lon,lat,separation,separation>warning_m)
def table(base_url:str,sources:list[tuple[float,float]],destinations:list[tuple[float,float]],timeout:float=60,retries:int=3)->tuple[list[list[int|None]],list[list[int|None]]]:
    coordinates=sources+destinations; coords=";".join(f"{lon},{lat}" for lon,lat in coordinates); query=urlencode({"sources":";".join(map(str,range(len(sources)))),"destinations":";".join(map(str,range(len(sources),len(coordinates)))),"annotations":"distance,duration"})
    for attempt in range(retries):
        try:
            with urlopen(f"{base_url.rstrip('/')}/table/v1/driving/{coords}?{query}",timeout=timeout) as response: payload=json.load(response)
            if payload.get("code")!="Ok": raise RuntimeError(f"OSRM table error: {payload.get('code')}")
            result=[]
            for key in ("distances","durations"):
                matrix=payload.get(key)
                if len(matrix)!=len(sources) or any(len(row)!=len(destinations) for row in matrix): raise RuntimeError("Incomplete OSRM table dimensions")
                normalized=[]
                for row_index,row in enumerate(matrix):
                    normalized_row=[]
                    for column_index,value in enumerate(row):
                        if value is None: normalized_row.append(None);continue
                        numeric=float(value)
                        if -1.0 <= numeric < 0 and coordinate_separation_m(sources[row_index],destinations[column_index]) <= 1.0: numeric=0.0
                        elif numeric < 0: raise ValueError(f"Negative OSRM {key} value {numeric!r} at row={row_index}, column={column_index}, source={sources[row_index]!r}, destination={destinations[column_index]!r}")
                        normalized_row.append(round_osrm(numeric))
                    normalized.append(normalized_row)
                result.append(normalized)
            return result[0],result[1]
        except (OSError,ValueError,RuntimeError,json.JSONDecodeError):
            if attempt+1==retries: raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")
