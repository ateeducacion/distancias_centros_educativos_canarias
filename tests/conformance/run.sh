#!/bin/sh
set -eu
expected='{"distance_m": 1200, "duration_s": 120}'
python_out=$(PYTHONPATH=src/python python3 -c 'from pathlib import Path;from canarias_route_matrix.binary import Reader;import json
with Reader(Path("data/samples/sample.bin")) as r:
 x=r.get_route("10000001","10000002");print(json.dumps({"distance_m":x.distance_meters,"duration_s":x.duration_seconds},sort_keys=True))')
node_out=$(node --input-type=module -e 'import fs from "node:fs";import {RouteMatrix} from "./packages/javascript/src/index.js";const b=fs.readFileSync("data/samples/sample.bin");const r=new RouteMatrix(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).getRoute("10000001","10000002");console.log(JSON.stringify({distance_m:r.distanceMeters,duration_s:r.durationSeconds}).replace(/:/g,": ").replace(/,/g,", "))')
test "$python_out" = "$expected"
test "$node_out" = "$expected"
php_out=$(php -r 'foreach(glob("packages/php/src/Exception/*.php") as $f)require $f;require "packages/php/src/RouteResult.php";require "packages/php/src/Reader.php";$r=(new AteEducacion\CanariasRouteMatrix\Reader("data/samples/sample.bin"))->getRoute("10000001","10000002");echo json_encode(["distance_m"=>$r->distanceMeters,"duration_s"=>$r->durationSeconds]);')
test "$php_out" = '{"distance_m":1200,"duration_s":120}'
echo 'Cross-language conformance passed'
