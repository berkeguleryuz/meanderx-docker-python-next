import json

import httpx

from ingest.arcgis_client import esri_polyline_to_geojson, fetch_layer


def make_mock(pages):
    """pages: list of ArcGIS JSON responses served in order."""
    calls = []

    def handler(request):
        calls.append(dict(request.url.params))
        return httpx.Response(200, json=pages[len(calls) - 1])

    return httpx.MockTransport(handler), calls


def feat(oid, feeder="1B1234"):
    return {
        "attributes": {"OBJECTID": oid, "FEEDER_ID": feeder},
        "geometry": {"paths": [[[-73.9, 40.7], [-73.8, 40.8]]]},
    }


def test_fetch_layer_paginates_until_last_short_page():
    pages = [
        {"features": [feat(1), feat(2)], "exceededTransferLimit": True},
        {"features": [feat(3)]},
    ]
    transport, calls = make_mock(pages)
    client = httpx.Client(transport=transport)
    rows = list(fetch_layer(0, client=client, page_size=2))
    assert len(rows) == 3
    assert calls[1]["resultOffset"] == "2"
    assert rows[0]["attributes"]["FEEDER_ID"] == "1B1234"
    geo = json.loads(rows[0]["geometry_geojson"])
    assert geo["type"] == "MultiLineString"


def test_fetch_layer_raises_on_arcgis_error_payload():
    pages = [{"error": {"code": 400, "message": "bad"}}]
    transport, _ = make_mock(pages)
    client = httpx.Client(transport=transport)
    try:
        list(fetch_layer(0, client=client))
        assert False, "should raise"
    except RuntimeError as e:
        assert "bad" in str(e)


def test_esri_polyline_to_geojson_none():
    assert esri_polyline_to_geojson(None) is None
