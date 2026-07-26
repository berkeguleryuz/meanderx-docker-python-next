from ingest.osm_substations import best_match, normalize_name


def test_normalize_name():
    assert normalize_name("Bridge St. Substation") == "bridge st"
    assert normalize_name("AVENUE A #2") == "avenue a 2"


def test_best_match_exact_and_fuzzy():
    osm = {
        "bridge st": '{"type":"Point","coordinates":[-73.98,40.7]}',
        "avenue a 2": '{"type":"Point","coordinates":[-73.9,40.72]}',
    }
    assert best_match("BRIDGE ST", osm) == osm["bridge st"]
    assert best_match("Avenue A No. 2", osm) == osm["avenue a 2"]
    assert best_match("TOTALLY UNKNOWN", osm) is None


def test_match_substations_persists_to_table(tmp_path):
    import duckdb

    from ingest.osm_substations import match_substations
    from ingest.snapshot import write_snapshot
    from ingest.transform import run_transform
    from tests.test_transform import rows

    sid = write_snapshot(rows(), tmp_path)
    db = tmp_path / "test.duckdb"
    run_transform(db, tmp_path, sid)
    n = match_substations(db, {"bridge st": '{"type":"Point","coordinates":[-73.9,40.7]}'})
    assert n == 1
    con = duckdb.connect(str(db))
    assert con.sql("SELECT count(*) FROM osm_substation_locations").fetchone()[0] == 1
    assert (
        con.sql("SELECT location_source FROM substations WHERE name='BRIDGE ST'").fetchone()[0]
        is not None
    )
