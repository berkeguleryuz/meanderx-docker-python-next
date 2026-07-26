import duckdb

from ingest.snapshot import write_snapshot
from ingest.transform import run_transform


def rows(local_min=1.5, queued=3.0):
    """local_min/queued apply only to feeder 1B1234; 2C9999 stays constant
    so SCD2 tests can distinguish changed vs unchanged feeders."""

    def seg(oid, fid, sub):
        return {
            "attributes": {
                "OBJECTID": oid,
                "FEEDER_ID": fid,
                "SUBSTATION": sub,
                "FRIENDLY_CIRCUIT_NAME": f"Feeder {fid}",
                "LOCAL_MIN": local_min if fid == "1B1234" else 1.0,
                "LOCAL_MAX": 5.0,
                "PV_THERMAL": 2.5,
                "QUEUED_DER": queued,
                "CONNECTED_DER": 1.0,
                "LOCAL_VOLTAGE": 13.2,
                "NYISO_LOAD_ZONE": "J",
                "HC_REFESH_DATE": 1750000000000,
                "DER_REFESH_DATE": 1751000000000,
                "PV_ANTI_ISLAND": 3.1,
                "PV_BANK_RATING": 4.2,
                "PV_FEEDER_RATING": 4.5,
                "PV_FLICKER": 5.1,
                "PV_OVER_VOLTAGE": 6.0,
                "PV_REGULATOR_DEVIATION": 7.0,
                "PV_SECTION": 2.9,
                "PV_VOLTAGE_DEVIATION": 8.0,
            },
            "geometry_geojson": '{"type":"MultiLineString","coordinates":[[[-73.9,40.7],[-73.8,40.8]]]}',
        }

    return {
        0: [seg(1, "1B1234", "BRIDGE ST"), seg(2, "1B1234", "BRIDGE ST"), seg(3, "2C9999", "AVENUE A")],
        2: [
            {
                "attributes": {"OBJECTID": 1, "SUBSTATION": "BRIDGE ST", "CONNECTED": 4.0, "QUEUED": 6.0},
                "geometry_geojson": None,
            }
        ],
    }


def test_transform_builds_core_tables(tmp_path):
    sid = write_snapshot(rows(), tmp_path)
    db = tmp_path / "test.duckdb"
    run_transform(db, tmp_path, sid)
    con = duckdb.connect(str(db))
    assert con.sql("SELECT count(*) FROM segments").fetchone()[0] == 3
    f = con.sql(
        "SELECT substation, hosting_capacity_min_mw, queued_der_mw, segment_count "
        "FROM feeders WHERE feeder_id='1B1234'"
    ).fetchone()
    assert f == ("BRIDGE ST", 1.5, 3.0, 2)
    pv = con.sql("SELECT pv_thermal_mw FROM feeders WHERE feeder_id='1B1234'").fetchone()[0]
    assert pv == 2.5
    s = con.sql(
        "SELECT feeder_count, geometry_geojson, location_source FROM substations WHERE name='BRIDGE ST'"
    ).fetchone()
    assert s[0] == 1
    assert s[2] == "estimated"  # no OSM match, so centroid of its feeders' segments
    import json
    lng, lat = json.loads(s[1])["coordinates"]
    assert -74.0 < lng < -73.7 and 40.6 < lat < 40.9


def test_history_scd2_close_and_open(tmp_path):
    from datetime import datetime, timezone

    db = tmp_path / "test.duckdb"
    sid1 = write_snapshot(rows(local_min=1.5), tmp_path, now=datetime(2026, 7, 1, tzinfo=timezone.utc))
    run_transform(db, tmp_path, sid1)
    sid2 = write_snapshot(rows(local_min=0.5), tmp_path, now=datetime(2026, 7, 2, tzinfo=timezone.utc))
    run_transform(db, tmp_path, sid2)
    con = duckdb.connect(str(db))
    hist = con.sql(
        "SELECT hosting_capacity_min_mw, valid_from, valid_to FROM feeder_history "
        "WHERE feeder_id='1B1234' ORDER BY valid_from"
    ).fetchall()
    assert len(hist) == 2
    assert hist[0][0] == 1.5 and hist[0][2] is not None  # closed
    assert hist[1][0] == 0.5 and hist[1][2] is None  # open
    n = con.sql("SELECT count(*) FROM feeder_history WHERE feeder_id='2C9999'").fetchone()[0]
    assert n == 1


def test_transform_idempotent_per_snapshot(tmp_path):
    sid = write_snapshot(rows(), tmp_path)
    db = tmp_path / "test.duckdb"
    run_transform(db, tmp_path, sid)
    run_transform(db, tmp_path, sid)  # re-run same snapshot
    con = duckdb.connect(str(db))
    assert con.sql("SELECT count(*) FROM feeder_history WHERE feeder_id='1B1234'").fetchone()[0] == 1
