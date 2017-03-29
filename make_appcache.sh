#!/bin/bash
set -eo pipefail


appcache-manifest \
  "build/index.{html,css,js}" \
  "build/**/*.{css,js}" \
  "build/*.png" \
  "build/**/*.png" \
  --network-star \
  -o build/index.appcache

echo "APPCACHE BUILT:"
cat build/index.appcache
