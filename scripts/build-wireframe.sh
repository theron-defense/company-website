#!/usr/bin/env bash
# Bundle src/js/wireframe.js + Three.js into js/wireframe.bundle.js (self-hosted, minified).
# One-time setup:
#   mkdir -p .tools/bundle && cd .tools/bundle && npm init -y && npm i esbuild@0.24 three@0.160.0
# Then from repo root: bash scripts/build-wireframe.sh   (bump js/wireframe.bundle.js?v= in index.html)
set -euo pipefail
cd "$(dirname "$0")/.."
B=.tools/bundle/node_modules
"$B/.bin/esbuild" src/js/wireframe.js \
  --bundle --minify --format=esm --target=es2020 \
  --alias:three="./$B/three/build/three.module.js" \
  --alias:three/addons/loaders/GLTFLoader.js="./$B/three/examples/jsm/loaders/GLTFLoader.js" \
  --alias:three/addons/utils/BufferGeometryUtils.js="./$B/three/examples/jsm/utils/BufferGeometryUtils.js" \
  --outfile=js/wireframe.bundle.js
ls -la js/wireframe.bundle.js
