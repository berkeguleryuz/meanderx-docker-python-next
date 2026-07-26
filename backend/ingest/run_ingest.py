import os

from app.config import settings
from ingest.arcgis_client import fetch_layer
from ingest.snapshot import write_snapshot
from ingest.transform import run_transform


def main() -> None:
    layers = [int(x) for x in os.environ.get("INGEST_LAYERS", "0,2").split(",")]
    page_size = int(os.environ.get("INGEST_PAGE_SIZE", "2000"))
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    rows_by_layer = {}
    for layer_id in layers:
        print(f"Fetching layer {layer_id}...", flush=True)
        rows_by_layer[layer_id] = list(fetch_layer(layer_id, page_size=page_size))
        print(f"  layer {layer_id}: {len(rows_by_layer[layer_id])} features", flush=True)
    snapshot_id = write_snapshot(rows_by_layer, settings.DATA_DIR)
    if snapshot_id is None:
        print("No change since last snapshot; nothing to do.")
        return
    print(f"Snapshot {snapshot_id} written; transforming...")
    run_transform(settings.DB_PATH, settings.DATA_DIR, snapshot_id)
    print("Done.")


if __name__ == "__main__":
    main()
