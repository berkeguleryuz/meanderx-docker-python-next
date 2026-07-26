import duckdb

from ingest.snapshot import read_registry, write_snapshot

ROWS = {
    0: [
        {
            "attributes": {"OBJECTID": 1, "FEEDER_ID": "1B1234", "LOCAL_MIN": 1.5},
            "geometry_geojson": '{"type":"MultiLineString","coordinates":[[[-73.9,40.7],[-73.8,40.8]]]}',
        }
    ],
    2: [
        {
            "attributes": {"OBJECTID": 1, "SUBSTATION": "BRIDGE ST", "QUEUED": 2.0},
            "geometry_geojson": None,
        }
    ],
}


def test_write_snapshot_creates_parquet_and_registry(tmp_path):
    sid = write_snapshot(ROWS, tmp_path)
    assert sid is not None
    assert (tmp_path / "snapshots" / sid / "layer0.parquet").exists()
    reg = read_registry(tmp_path)
    assert reg[-1]["snapshot_id"] == sid
    assert reg[-1]["row_counts"] == {"0": 1, "2": 1}
    n = duckdb.sql(f"SELECT count(*) FROM '{tmp_path}/snapshots/{sid}/layer0.parquet'").fetchone()[0]
    assert n == 1


def test_write_snapshot_skips_identical_content(tmp_path):
    sid1 = write_snapshot(ROWS, tmp_path)
    sid2 = write_snapshot(ROWS, tmp_path)
    assert sid1 is not None and sid2 is None
    assert len(read_registry(tmp_path)) == 1


def test_write_snapshot_detects_changed_content(tmp_path):
    from datetime import datetime, timezone

    write_snapshot(ROWS, tmp_path, now=datetime(2026, 7, 1, tzinfo=timezone.utc))
    changed = {
        0: [dict(ROWS[0][0], attributes={**ROWS[0][0]["attributes"], "LOCAL_MIN": 9.9})],
        2: ROWS[2],
    }
    sid2 = write_snapshot(changed, tmp_path, now=datetime(2026, 7, 2, tzinfo=timezone.utc))
    assert sid2 is not None
    assert len(read_registry(tmp_path)) == 2
