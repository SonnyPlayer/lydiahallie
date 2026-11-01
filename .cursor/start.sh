#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3000/; then
  exit 0
fi
exec python3 scripts/serve.py
