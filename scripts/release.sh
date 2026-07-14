#!/bin/sh
set -eu
echo 'Local release check only; remote publication requires explicit authorization.'
make release-check
