#!/bin/sh
set -eu

expected='{"distance_m": 1200}'
python_out=$(PYTHONPATH=src/python python3 -c 'from pathlib import Path;from canarias_route_matrix.binary import Reader;import json
with Reader(Path("data/samples/sample.dat")) as reader:
 distance=reader.get_distance("10000001","10000002");print(json.dumps({"distance_m":distance.distance_meters},sort_keys=True))')
node_out=$(node --input-type=module -e 'import fs from "node:fs";import {DistanceMatrix} from "./packages/javascript/src/index.js";const data=fs.readFileSync("data/samples/sample.dat");const result=new DistanceMatrix(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)).getDistance("10000001","10000002");console.log(JSON.stringify({distance_m:result.distanceMeters}).replace(/:/g,": ").replace(/,/g,", "))')
test "$python_out" = "$expected"
test "$node_out" = "$expected"
php_out=$(php -r 'foreach(glob("packages/php/src/Exception/*.php") as $file)require $file;require "packages/php/src/DistanceResult.php";require "packages/php/src/Reader.php";$result=(new AteEducacion\CanariasRouteMatrix\Reader("data/samples/sample.dat"))->getDistance("10000001","10000002");echo json_encode(["distance_m"=>$result->distanceMeters]);')
test "$php_out" = '{"distance_m":1200}'
echo 'Cross-language distance conformance passed'
