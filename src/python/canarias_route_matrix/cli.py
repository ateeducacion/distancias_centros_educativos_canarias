"""Administrative and query CLI."""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
from .binary.reader import Reader
from .config import load_settings
from .csv_importer import import_centers,write_report
from .downloader import download,resolve_centers_resource
from .errors import RouteMatrixError

def parser()->argparse.ArgumentParser:
    root=argparse.ArgumentParser(prog="canarias-route-matrix"); root.add_argument("--config",type=Path,default=Path("config"));root.add_argument("--cache-dir",type=Path,default=Path(".cache"));root.add_argument("--output-dir",type=Path,default=Path("dist"));root.add_argument("--log-level",default="INFO");root.add_argument("--json",action="store_true");root.add_argument("--force",action="store_true");root.add_argument("--resume",action="store_true")
    commands=root.add_subparsers(dest="command",required=True)
    commands.add_parser("download-centers"); commands.add_parser("download-osm");commands.add_parser("validate-centers")
    for name in ("prepare-osrm","validate-snapping","build","verify","inspect","manifest"): commands.add_parser(name)
    query=commands.add_parser("query");query.add_argument("origin");query.add_argument("destination");query.add_argument("--binary",type=Path,default=Path("data/samples/sample.bin"))
    return root
def run(args:argparse.Namespace)->int:
    settings=load_settings(args.config)
    if args.command=="query":
        with Reader(args.binary) as reader: route=reader.get_route(args.origin,args.destination)
        payload={"origin":args.origin,"destination":args.destination,"distance_m":route.distance_meters,"duration_s":route.duration_seconds};print(json.dumps(payload) if args.json else f"{route.distance_meters} m, {route.duration_seconds} s");return 0
    if args.command=="download-centers":
        url=resolve_centers_resource(settings.ckan_api_url,settings.dataset_id,settings.centers_fallback_url); meta=download(url,args.cache_dir/"centers.csv",args.cache_dir/"centers.meta.json",force=args.force);print(json.dumps(meta.as_dict(),sort_keys=True));return 0
    if args.command=="download-osm":
        meta=download(settings.osm_url,args.cache_dir/"canary-islands.osm.pbf",args.cache_dir/"osm.meta.json",force=args.force);print(json.dumps(meta.as_dict(),sort_keys=True));return 0
    if args.command=="validate-centers":
        result=import_centers(args.cache_dir/"centers.csv",settings.code_pattern);args.output_dir.mkdir(parents=True,exist_ok=True);write_report(result,args.output_dir/"validation-report.json",args.output_dir/"validation-report.md");print(json.dumps({"included":result.included,"excluded":result.excluded,"rejected":result.rejected}));return 1 if result.rejected else 0
    raise RouteMatrixError(f"Command {args.command} requires the full generation environment; see docs/generation.md")
def main()->None:
    try: raise SystemExit(run(parser().parse_args()))
    except (RouteMatrixError,OSError,ValueError) as exc: print(json.dumps({"error":type(exc).__name__,"message":str(exc)}),file=sys.stderr);raise SystemExit(2) from exc
if __name__=="__main__": main()
