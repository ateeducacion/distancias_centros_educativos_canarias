#!/bin/sh
# Assemble the GitHub Pages artifact from its independent pieces:
#
#   public/              <- standalone landing page (www/)
#   public/docs/         <- Zensical documentation build (site/)
#   public/data/latest/  <- published data artifacts (canonical download path)
#
# The landing lives at the site root; the documentation is served under /docs/.
# Keeping the data at the root /data/latest/ preserves the public download URL
# used by the code examples and external integrations.
#
# Configuration via environment variables (all optional):
#   WWW_DIR   landing source directory        (default: www)
#   SITE_DIR  Zensical build output directory (default: site)
#   DATA_DIR  directory with the data files   (default: unset -> data omitted)
#   OUT_DIR   artifact output directory       (default: public)
set -eu

WWW_DIR="${WWW_DIR:-www}"
SITE_DIR="${SITE_DIR:-site}"
DATA_DIR="${DATA_DIR:-}"
OUT_DIR="${OUT_DIR:-public}"

if [ ! -d "$WWW_DIR" ]; then
  echo "assemble-site: landing directory '$WWW_DIR' not found" >&2
  exit 1
fi
if [ ! -d "$SITE_DIR" ]; then
  echo "assemble-site: Zensical output '$SITE_DIR' not found (run the build first)" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Landing at the root. Drop any locally-staged preview data so it never ships.
cp -R "$WWW_DIR"/. "$OUT_DIR"/
rm -rf "$OUT_DIR/data"

# Documentation under /docs.
mkdir -p "$OUT_DIR/docs"
cp -R "$SITE_DIR"/. "$OUT_DIR/docs"/

# Published data at the canonical root path.
if [ -n "$DATA_DIR" ]; then
  if [ ! -d "$DATA_DIR" ]; then
    echo "assemble-site: data directory '$DATA_DIR' not found" >&2
    exit 1
  fi
  mkdir -p "$OUT_DIR/data/latest"
  cp -R "$DATA_DIR"/. "$OUT_DIR/data/latest"/
fi

echo "assemble-site: wrote $OUT_DIR (landing + docs/ + data/latest)"
