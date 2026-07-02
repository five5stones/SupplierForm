#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-supplier-form:0.2.0}"
ARCHIVE="${2:-supplier-form.tar.gz}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building ${IMAGE}..."
docker compose build

echo "Saving to ${ARCHIVE}..."
docker save "$IMAGE" | gzip > "$ARCHIVE"

echo
echo "Copy to your server, then on the server run:"
echo "  docker load < ${ARCHIVE}"
echo "  cd ~/SupplierForm"
echo "  docker compose up -d"
