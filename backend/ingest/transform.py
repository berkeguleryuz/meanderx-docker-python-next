import json
from pathlib import Path

import duckdb


def _estimate_missing_substation_locations(con) -> None:
    """Fill missing substation locations with the centroid of their feeders' segments."""
    missing = [r[0] for r in con.execute(
        "SELECT name FROM substations WHERE geometry_geojson IS NULL").fetchall()]
    for name in missing:
        segs = con.execute(
            "SELECT geometry_geojson FROM segments "
            "WHERE substation = ? AND geometry_geojson IS NOT NULL LIMIT 2000",
            [name]).fetchall()
        xs, ys, n = 0.0, 0.0, 0
        for (g,) in segs:
            for path in json.loads(g).get("coordinates", []):
                for x, y in path:
                    xs, ys, n = xs + x, ys + y, n + 1
        if n:
            point = json.dumps({"type": "Point", "coordinates": [xs / n, ys / n]})
            con.execute(
                "UPDATE substations SET geometry_geojson = ?, location_source = 'estimated' "
                "WHERE name = ?", [point, name])


def run_transform(db_path: Path, data_dir: Path, snapshot_id: str) -> None:
    """Derive serving tables and SCD2 feeder_history from a raw parquet snapshot."""
    snap = Path(data_dir) / "snapshots" / snapshot_id
    con = duckdb.connect(str(db_path))
    try:
        con.execute(f"""
            CREATE OR REPLACE TABLE segments AS
            SELECT FEEDER_ID AS feeder_id, SUBSTATION AS substation,
                   FRIENDLY_CIRCUIT_NAME AS friendly_name,
                   LOCAL_MIN AS local_min, LOCAL_MAX AS local_max,
                   PV_THERMAL AS pv_thermal,
                   QUEUED_DER AS queued_der, CONNECTED_DER AS connected_der,
                   LOCAL_VOLTAGE AS local_voltage, NYISO_LOAD_ZONE AS nyiso_load_zone,
                   HC_REFESH_DATE AS hc_refresh_date, DER_REFESH_DATE AS der_refresh_date,
                   PV_ANTI_ISLAND AS pv_anti_island, PV_BANK_RATING AS pv_bank_rating,
                   PV_FEEDER_RATING AS pv_feeder_rating, PV_FLICKER AS pv_flicker,
                   PV_OVER_VOLTAGE AS pv_over_voltage,
                   PV_REGULATOR_DEVIATION AS pv_regulator_deviation,
                   PV_SECTION AS pv_section, PV_VOLTAGE_DEVIATION AS pv_voltage_deviation,
                   geometry_geojson, '{snapshot_id}' AS snapshot_id
            FROM '{snap}/layer0.parquet'
        """)
        con.execute("""
            CREATE OR REPLACE TABLE feeders AS
            SELECT feeder_id, any_value(substation) AS substation,
                   any_value(friendly_name) AS friendly_name,
                   min(local_min) AS hosting_capacity_min_mw,
                   max(local_max) AS hosting_capacity_max_mw,
                   min(pv_thermal) AS pv_thermal_mw,
                   max(queued_der) AS queued_der_mw,
                   max(connected_der) AS connected_der_mw,
                   any_value(local_voltage) AS local_voltage_kv,
                   any_value(nyiso_load_zone) AS nyiso_load_zone,
                   max(hc_refresh_date) AS hc_refresh_date,
                   max(der_refresh_date) AS der_refresh_date,
                   min(pv_anti_island) AS pv_anti_island_mw,
                   min(pv_bank_rating) AS pv_bank_rating_mw,
                   min(pv_feeder_rating) AS pv_feeder_rating_mw,
                   min(pv_flicker) AS pv_flicker_mw,
                   min(pv_over_voltage) AS pv_over_voltage_mw,
                   min(pv_regulator_deviation) AS pv_regulator_deviation_mw,
                   min(pv_section) AS pv_section_mw,
                   min(pv_voltage_deviation) AS pv_voltage_deviation_mw,
                   count(*) AS segment_count
            FROM segments WHERE feeder_id IS NOT NULL
            GROUP BY feeder_id
        """)
        con.execute(
            "CREATE TABLE IF NOT EXISTS osm_substation_locations (name VARCHAR PRIMARY KEY, geometry_geojson VARCHAR)"
        )
        con.execute(f"""
            CREATE OR REPLACE TABLE substations AS
            SELECT s.name, s.connected_mw, s.queued_mw, f.feeder_count,
                   o.geometry_geojson,
                   CASE WHEN o.geometry_geojson IS NOT NULL THEN 'osm' END AS location_source
            FROM (SELECT SUBSTATION AS name, max(CONNECTED) AS connected_mw,
                         max(QUEUED) AS queued_mw
                  FROM '{snap}/layer2.parquet' WHERE SUBSTATION IS NOT NULL
                  GROUP BY SUBSTATION) s
            LEFT JOIN (SELECT substation, count(*) AS feeder_count
                       FROM feeders GROUP BY substation) f
            ON f.substation = s.name
            LEFT JOIN osm_substation_locations o ON o.name = s.name
        """)
        _estimate_missing_substation_locations(con)
        con.execute("""
            CREATE TABLE IF NOT EXISTS feeder_history (
                feeder_id VARCHAR, substation VARCHAR,
                hosting_capacity_min_mw DOUBLE, hosting_capacity_max_mw DOUBLE,
                pv_thermal_mw DOUBLE,
                queued_der_mw DOUBLE, connected_der_mw DOUBLE,
                attrs_hash VARCHAR, valid_from VARCHAR, valid_to VARCHAR)
        """)
        con.execute("""
            CREATE OR REPLACE TEMP TABLE current_agg AS
            SELECT feeder_id, substation, hosting_capacity_min_mw, hosting_capacity_max_mw,
                   pv_thermal_mw, queued_der_mw, connected_der_mw,
                   md5(concat_ws('|', substation, hosting_capacity_min_mw,
                       hosting_capacity_max_mw, pv_thermal_mw,
                       queued_der_mw, connected_der_mw)) AS attrs_hash
            FROM feeders
        """)
        con.execute(
            """
            UPDATE feeder_history h SET valid_to = ?
            WHERE h.valid_to IS NULL AND EXISTS (
                SELECT 1 FROM current_agg a
                WHERE a.feeder_id = h.feeder_id AND a.attrs_hash <> h.attrs_hash)
            """,
            [snapshot_id],
        )
        con.execute(
            """
            INSERT INTO feeder_history
            SELECT a.feeder_id, a.substation, a.hosting_capacity_min_mw,
                   a.hosting_capacity_max_mw, a.pv_thermal_mw,
                   a.queued_der_mw, a.connected_der_mw,
                   a.attrs_hash, ?, NULL
            FROM current_agg a
            LEFT JOIN feeder_history h
              ON h.feeder_id = a.feeder_id AND h.valid_to IS NULL
            WHERE h.feeder_id IS NULL
            """,
            [snapshot_id],
        )
    finally:
        con.close()
