#!/bin/sh
set -e

# Garante que dependências nativas sejam compiladas dentro do container
if [ ! -d node_modules ]; then
  echo "[entrypoint] Installing dependencies (npm ci)"
  npm ci
fi

echo "[entrypoint] Starting dev server"
exec npm run dev


