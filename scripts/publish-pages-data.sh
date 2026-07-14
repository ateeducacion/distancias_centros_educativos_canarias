#!/bin/sh
set -eu
test -f dist/manifest.json
mkdir -p site/data/latest
cp dist/manifest.json dist/centers.min.json dist/canarias-education-routes.bin site/data/latest/
