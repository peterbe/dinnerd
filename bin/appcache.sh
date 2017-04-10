#!/bin/bash
set -eo pipefail


# "build/**/*.png" \
appcache-manifest \
  "build/index.{html,css,js}" \
  "build/**/*.{css,js}" \
  "build/static/*.png" \
  --network-star \
  -o build/index.appcache

echo "APPCACHE BUILT:"
cat build/index.appcache
