import json


def _dicts(rel) -> list[dict]:
    cols = [d[0] for d in rel.description]
    return [dict(zip(cols, row)) for row in rel.fetchall()]


SORT_KEYS = {
    "id": "feeder_id ASC",
    "capacity": "pv_thermal_mw DESC NULLS LAST",
    "queued": "queued_der_mw DESC NULLS LAST",
    "connected": "connected_der_mw DESC NULLS LAST",
}


def search_feeders(con, q: str, limit: int = 20, sort: str = "id") -> list[dict]:
    order = SORT_KEYS.get(sort, SORT_KEYS["id"])
    return _dicts(
        con.execute(
            "SELECT * FROM feeders WHERE feeder_id ILIKE ? OR friendly_name ILIKE ? "
            f"ORDER BY {order} LIMIT ?",
            [f"%{q}%", f"%{q}%", limit],
        )
    )


def get_feeder(con, feeder_id: str) -> dict | None:
    rows = _dicts(con.execute("SELECT * FROM feeders WHERE feeder_id = ?", [feeder_id]))
    if not rows:
        return None
    feeder = rows[0]
    segs = con.execute(
        "SELECT geometry_geojson FROM segments WHERE feeder_id = ? AND geometry_geojson IS NOT NULL",
        [feeder_id],
    ).fetchall()
    feeder["geometry"] = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {}, "geometry": json.loads(g[0])} for g in segs
        ],
    }
    return feeder


def get_feeder_history(con, feeder_id: str) -> list[dict]:
    return _dicts(
        con.execute(
            "SELECT * EXCLUDE (attrs_hash) FROM feeder_history WHERE feeder_id = ? "
            "ORDER BY valid_from",
            [feeder_id],
        )
    )


def search_substations(con, q: str, limit: int = 20) -> list[dict]:
    return _dicts(
        con.execute(
            "SELECT * FROM substations WHERE name ILIKE ? ORDER BY name LIMIT ?",
            [f"%{q}%", limit],
        )
    )


def get_substation(con, name: str) -> dict | None:
    rows = _dicts(con.execute("SELECT * FROM substations WHERE name = ?", [name]))
    if not rows:
        return None
    sub = rows[0]
    sub["feeders"] = _dicts(
        con.execute(
            "SELECT feeder_id, friendly_name, hosting_capacity_min_mw, hosting_capacity_max_mw, "
            "pv_thermal_mw, queued_der_mw, connected_der_mw "
            "FROM feeders WHERE substation = ? ORDER BY feeder_id",
            [name],
        )
    )
    geo = sub.pop("geometry_geojson", None)
    sub["geometry"] = json.loads(geo) if geo else None
    return sub
