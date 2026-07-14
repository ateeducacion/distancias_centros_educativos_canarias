#!/bin/sh
set -eu
exec bin/route-matrix download-centers "$@"
