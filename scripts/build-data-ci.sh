#!/bin/sh
set -eu

CACHE_DIR=${CACHE_DIR:-.cache}
OUTPUT_DIR=${OUTPUT_DIR:-dist}
OSRM_IMAGE=${OSRM_IMAGE:-ghcr.io/project-osrm/osrm-backend:v5.27.1}
DATA_VERSION=${DATA_VERSION:-main-$(git rev-parse --short=12 HEAD)}
SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-$(git log -1 --format=%ct)}
OSRM_CONTAINER="canarias-osrm-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"

case "$CACHE_DIR" in
    /*) CACHE_PATH=$CACHE_DIR ;;
    *) CACHE_PATH=$PWD/$CACHE_DIR ;;
esac

OSRM_PATH=$CACHE_PATH/osrm

cleanup() {
    docker rm -f "$OSRM_CONTAINER" >/dev/null 2>&1 || true
}

trap cleanup 0 INT TERM

bin/route-matrix --cache-dir "$CACHE_DIR" download-centers
bin/route-matrix --cache-dir "$CACHE_DIR" download-osm

rm -rf "$OSRM_PATH"
mkdir -p "$OSRM_PATH"
cp "$CACHE_PATH/canary-islands.osm.pbf" "$OSRM_PATH/canary-islands.osm.pbf"

docker run --rm \
    --volume "$OSRM_PATH:/data" \
    "$OSRM_IMAGE" \
    osrm-extract -p /opt/car.lua /data/canary-islands.osm.pbf

docker run --rm \
    --volume "$OSRM_PATH:/data" \
    "$OSRM_IMAGE" \
    osrm-partition /data/canary-islands.osrm

docker run --rm \
    --volume "$OSRM_PATH:/data" \
    "$OSRM_IMAGE" \
    osrm-customize /data/canary-islands.osrm

cleanup

docker run --detach --rm \
    --name "$OSRM_CONTAINER" \
    --publish 127.0.0.1:5000:5000 \
    --volume "$OSRM_PATH:/data:ro" \
    "$OSRM_IMAGE" \
    osrm-routed --algorithm mld /data/canary-islands.osrm >/dev/null

attempt=0
until curl --fail --silent --show-error \
    "http://127.0.0.1:5000/nearest/v1/driving/-15.4,28.1?number=1" >/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        docker logs "$OSRM_CONTAINER" >&2 || true
        echo "OSRM did not become ready" >&2
        exit 1
    fi
    sleep 2
done

CACHE_DIR=$CACHE_DIR \
OUTPUT_DIR=$OUTPUT_DIR \
OSRM_URL=http://127.0.0.1:5000 \
DATA_VERSION=$DATA_VERSION \
SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH \
uv run python scripts/build-production.py
