"""Conditional, atomic and verifiable source downloads."""
from __future__ import annotations
from dataclasses import dataclass,asdict
from pathlib import Path
import hashlib,json,os,tempfile,time
from urllib.request import Request,urlopen
from urllib.error import URLError
from .errors import SourceResolutionError

@dataclass(frozen=True)
class DownloadMetadata:
    url:str; etag:str|None; last_modified:str|None; size:int; sha256:str; downloaded_at:str
    def as_dict(self)->dict[str,object]: return asdict(self)

def resolve_centers_resource(api_url:str,dataset_id:str,fallback_url:str,timeout:float=30)->str:
    try:
        with urlopen(f"{api_url.rstrip('/')}/package_show?id={dataset_id}",timeout=timeout) as response: payload=json.load(response)
        if not payload.get("success"): raise SourceResolutionError("CKAN package_show was unsuccessful")
        matches=[r for r in payload["result"].get("resources",[]) if r.get("state","active")=="active" and str(r.get("name","")).casefold()=="centros.csv" and str(r.get("format","")).casefold()=="csv"]
        if len(matches)>1: raise SourceResolutionError("Several active centros.csv resources are ambiguous")
        if len(matches)==1 and matches[0].get("url"): return str(matches[0]["url"])
    except SourceResolutionError: raise
    except (OSError,ValueError,KeyError,URLError): pass
    if not fallback_url: raise SourceResolutionError("CKAN resolution failed and no fallback URL is configured")
    return fallback_url

def download(url:str,destination:Path,metadata_path:Path,timeout:float=60,retries:int=3,force:bool=False)->DownloadMetadata:
    headers={"User-Agent":"canarias-route-matrix/0.1"}
    if metadata_path.exists() and not force:
        old=json.loads(metadata_path.read_text(encoding="utf-8"));
        if old.get("etag"): headers["If-None-Match"]=old["etag"]
        elif old.get("last_modified"): headers["If-Modified-Since"]=old["last_modified"]
    destination.parent.mkdir(parents=True,exist_ok=True); metadata_path.parent.mkdir(parents=True,exist_ok=True)
    for attempt in range(retries):
        fd,tmp=tempfile.mkstemp(prefix=f".{destination.name}.",dir=destination.parent)
        try:
            digest=hashlib.sha256(); size=0
            with urlopen(Request(url,headers=headers),timeout=timeout) as response,os.fdopen(fd,"wb") as stream:
                while chunk:=response.read(1024*1024): stream.write(chunk);digest.update(chunk);size+=len(chunk)
                stream.flush();os.fsync(stream.fileno()); final=response.geturl(); etag=response.headers.get("ETag"); modified=response.headers.get("Last-Modified")
            meta=DownloadMetadata(final,etag,modified,size,digest.hexdigest(),time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()))
            os.replace(tmp,destination); metadata_path.write_text(json.dumps(meta.as_dict(),sort_keys=True,indent=2)+"\n",encoding="utf-8"); return meta
        except BaseException:
            try: os.unlink(tmp)
            except FileNotFoundError: pass
            if attempt+1==retries: raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")
