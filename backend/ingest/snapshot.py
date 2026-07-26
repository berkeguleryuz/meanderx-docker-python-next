import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq


def content_hash(rows_by_layer: dict[int, list[dict]]) -> str:
    h = hashlib.sha256()
    for layer_id in sorted(rows_by_layer):
        for row in rows_by_layer[layer_id]:
            attrs = {k: v for k, v in row["attributes"].items() if k != "OBJECTID"}
            h.update(json.dumps([layer_id, attrs], sort_keys=True, default=str).encode())
    return h.hexdigest()


def read_registry(data_dir: Path) -> list[dict]:
    path = Path(data_dir) / "snapshots" / "registry.jsonl"
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _to_table(rows: list[dict]) -> pa.Table:
    keys = sorted({k for r in rows for k in r["attributes"]})
    cols: dict[str, list] = {k: [r["attributes"].get(k) for r in rows] for k in keys}
    cols["geometry_geojson"] = [r["geometry_geojson"] for r in rows]
    return pa.table(cols)


def write_snapshot(
    rows_by_layer: dict[int, list[dict]], data_dir: Path, now: datetime | None = None
) -> str | None:
    """Write a raw parquet snapshot; returns snapshot_id, or None if content is unchanged."""
    data_dir = Path(data_dir)
    chash = content_hash(rows_by_layer)
    registry = read_registry(data_dir)
    if registry and registry[-1]["content_hash"] == chash:
        return None
    now = now or datetime.now(timezone.utc)
    snapshot_id = now.strftime("%Y%m%dT%H%M%S")
    snap_dir = data_dir / "snapshots" / snapshot_id
    snap_dir.mkdir(parents=True)
    for layer_id, rows in rows_by_layer.items():
        pq.write_table(_to_table(rows), snap_dir / f"layer{layer_id}.parquet")
    entry = {
        "snapshot_id": snapshot_id,
        "ingested_at": now.isoformat(),
        "content_hash": chash,
        "row_counts": {str(k): len(v) for k, v in rows_by_layer.items()},
    }
    with open(data_dir / "snapshots" / "registry.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")
    return snapshot_id
