#!/bin/sh
# Assemble the GitHub Pages artifact from its independent pieces:
#
#   public/              <- hand-written website (www/)
#   public/data/latest/  <- published data artifacts (canonical download path)
#
# Keeping the data at the root /data/latest/ preserves the public download URL
# used by the code examples and external integrations.
#
# Configuration via environment variables (all optional):
#   WWW_DIR   website source directory       (default: www)
#   DATA_DIR  directory with the data files  (default: unset -> data omitted)
#   OUT_DIR   artifact output directory      (default: public)
set -eu

WWW_DIR="${WWW_DIR:-www}"
DATA_DIR="${DATA_DIR:-}"
OUT_DIR="${OUT_DIR:-public}"

if [ ! -d "$WWW_DIR" ]; then
  echo "assemble-site: website directory '$WWW_DIR' not found" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Website at the root. Drop any locally-staged preview data so it never ships.
cp -R "$WWW_DIR"/. "$OUT_DIR"/
rm -rf "$OUT_DIR/data"

# Published data at the canonical root path.
if [ -n "$DATA_DIR" ]; then
  if [ ! -d "$DATA_DIR" ]; then
    echo "assemble-site: data directory '$DATA_DIR' not found" >&2
    exit 1
  fi
  mkdir -p "$OUT_DIR/data/latest"
  cp -R "$DATA_DIR"/. "$OUT_DIR/data/latest"/
fi

echo "assemble-site: wrote $OUT_DIR (website + data/latest)"
