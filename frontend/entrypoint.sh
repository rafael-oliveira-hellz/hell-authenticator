#!/bin/sh
set -e

# Always ensure correct dependencies are present (react-native CLI)
echo "[frontend] Ensuring dependencies (npm install)"
npm install --legacy-peer-deps --no-audit --no-fund

echo "[frontend] Starting Metro bundler on 0.0.0.0:8081"
export CI=1
export FORCE_COLOR=0
exec npx @react-native-community/cli start --host 0.0.0.0 --port 8081 --no-interactive


