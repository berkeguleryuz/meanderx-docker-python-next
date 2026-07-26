import json
import time
from typing import Iterator

import httpx

from app.config import settings

MAX_RETRIES = 3


def esri_polyline_to_geojson(geom: dict | None) -> dict | None:
    if not geom or "paths" not in geom:
        return None
    return {"type": "MultiLineString", "coordinates": geom["paths"]}


def _get_with_retry(client: httpx.Client, url: str, params: dict) -> dict:
    last_exc = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"ArcGIS error: {data['error'].get('message')}")
            return data
        except (httpx.HTTPError, json.JSONDecodeError) as exc:
            last_exc = exc
            time.sleep(2**attempt)
    raise RuntimeError(f"ArcGIS request failed after {MAX_RETRIES} retries") from last_exc


def fetch_layer(
    layer_id: int, client: httpx.Client | None = None, page_size: int = 2000
) -> Iterator[dict]:
    """Yield every feature of a layer as {'attributes': ..., 'geometry_geojson': str|None}."""
    own_client = client is None
    client = client or httpx.Client(timeout=60)
    try:
        offset = 0
        while True:
            data = _get_with_retry(
                client,
                f"{settings.ARCGIS_BASE_URL}/{layer_id}/query",
                {
                    "f": "json",
                    "where": "1=1",
                    "outFields": "*",
                    "outSR": 4326,
                    "resultOffset": offset,
                    "resultRecordCount": page_size,
                },
            )
            feats = data.get("features", [])
            for f in feats:
                geo = esri_polyline_to_geojson(f.get("geometry"))
                yield {
                    "attributes": f["attributes"],
                    "geometry_geojson": json.dumps(geo) if geo else None,
                }
            if len(feats) < page_size:
                break
            offset += len(feats)
    finally:
        if own_client:
            client.close()
