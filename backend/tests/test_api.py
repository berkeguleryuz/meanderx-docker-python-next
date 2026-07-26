def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_search_feeders(client):
    r = client.get("/api/feeders", params={"search": "1B"})
    assert r.status_code == 200
    assert r.json()[0]["feeder_id"] == "1B1234"


def test_get_feeder_detail_with_geometry(client):
    r = client.get("/api/feeders/1B1234")
    body = r.json()
    assert body["hosting_capacity_min_mw"] == 1.5
    assert body["queued_der_mw"] == 3.0
    assert body["geometry"]["type"] == "FeatureCollection"
    assert len(body["geometry"]["features"]) == 2


def test_get_feeder_404(client):
    r = client.get("/api/feeders/NOPE")
    assert r.status_code == 404
    assert "NOPE" in r.json()["detail"]


def test_feeder_history(client):
    r = client.get("/api/feeders/1B1234/history")
    assert r.status_code == 200
    assert len(r.json()) == 1 and r.json()[0]["valid_to"] is None


def test_substation_detail_lists_feeders(client):
    r = client.get("/api/substations/BRIDGE ST")
    body = r.json()
    assert body["name"] == "BRIDGE ST"
    assert [f["feeder_id"] for f in body["feeders"]] == ["1B1234"]
    assert body["geometry"]["type"] == "Point"


def test_feeders_sort_by_capacity(client):
    r = client.get("/api/feeders", params={"sort": "capacity", "limit": 2000})
    vals = [f["pv_thermal_mw"] for f in r.json()]
    assert vals == sorted(vals, key=lambda v: (v is None, -(v or 0)))


def test_substation_404(client):
    r = client.get("/api/substations/NOPE")
    assert r.status_code == 404
    assert "NOPE" in r.json()["detail"]


def test_feeders_invalid_sort_falls_back_to_id(client):
    r = client.get("/api/feeders", params={"sort": "evil'; DROP TABLE feeders; --"})
    assert r.status_code == 200
    ids = [f["feeder_id"] for f in r.json()]
    assert ids == sorted(ids)
