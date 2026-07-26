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
