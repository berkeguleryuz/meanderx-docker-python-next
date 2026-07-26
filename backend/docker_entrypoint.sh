#!/bin/sh
set -e
cd /srv/backend
if [ ! -f "$DATA_DIR/meanderx.duckdb" ]; then
  echo "No database found — running initial ingest (this takes a few minutes)..."
  python -m ingest.run_ingest
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
