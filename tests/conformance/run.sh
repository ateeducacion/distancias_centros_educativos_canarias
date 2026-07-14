#!/bin/sh
set -eu

expected='{"distance_m": 1200}'

for fixture in data/samples/sample.dat data/samples/sample-v2.dat; do
    python_out=$(PYTHONPATH=src/python python3 -c 'from pathlib import Path;from canarias_route_matrix.binary import Reader;import json,sys
with Reader(Path(sys.argv[1])) as reader:
 distance=reader.get_distance("10000001","10000002");print(json.dumps({"distance_m":distance.distance_meters},sort_keys=True))' "$fixture")
    node_out=$(node --input-type=module -e 'import fs from "node:fs";import {DistanceMatrix} from "./packages/javascript/src/index.js";const data=fs.readFileSync(process.argv[1]);const result=new DistanceMatrix(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)).getDistance("10000001","10000002");console.log(JSON.stringify({distance_m:result.distanceMeters}).replace(/:/g,": ").replace(/,/g,", "))' "$fixture")
    php_out=$(php -r 'foreach(glob("packages/php/src/Exception/*.php") as $file)require $file;require "packages/php/src/DistanceResult.php";require "packages/php/src/Reader.php";$result=(new AteEducacion\CanariasRouteMatrix\Reader($argv[1]))->getDistance("10000001","10000002");echo json_encode(["distance_m"=>$result->distanceMeters]);' "$fixture")

    test "$python_out" = "$expected"
    test "$node_out" = "$expected"
    test "$php_out" = '{"distance_m":1200}'
done

echo 'Cross-language CEDIST02/CEDIST03 conformance passed'
