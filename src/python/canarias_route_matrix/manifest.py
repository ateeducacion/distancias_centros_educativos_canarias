"""Stable manifest and checksums."""
from __future__ import annotations
from pathlib import Path
import hashlib,json

def sha256(path:Path)->str:
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        while chunk:=stream.read(1024*1024): digest.update(chunk)
    return digest.hexdigest()
def write_checksums(paths:list[Path],destination:Path)->None:
    destination.write_text("".join(f"{sha256(path)}  {path.name}\n" for path in sorted(paths,key=lambda p:p.name)),encoding="ascii")
def stable_json(path:Path,payload:object,minified:bool=False)->None:
    path.write_text(json.dumps(payload,ensure_ascii=False,sort_keys=True,indent=None if minified else 2,separators=(",",":") if minified else None)+"\n",encoding="utf-8")
