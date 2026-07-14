#!/bin/sh
set -eu
command -v python3 >/dev/null || { echo 'python3 >= 3.11 is required' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Node.js/npm is required' >&2; exit 1; }
if command -v uv >/dev/null; then uv sync --all-extras; else echo 'uv missing: install from https://docs.astral.sh/uv/' >&2; fi
(cd packages/javascript && npm install)
if command -v composer >/dev/null; then (cd packages/php && composer install); else echo 'Composer missing: install from https://getcomposer.org/' >&2; fi
