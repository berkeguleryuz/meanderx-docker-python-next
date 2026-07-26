"""Phase 2 stretch: fill substations.geometry_geojson from OpenStreetMap.

OSM substations (power=substation) carry a `name` tag; ConEd substation names
come from the hosting capacity map. Matching is normalized-name equality first,
fuzzy ratio second — conservative threshold, because a wrong location is worse
than no location.
"""

import json
import re
from difflib import SequenceMatcher
from pathlib import Path

import duckdb

STOPWORDS = {"substation", "sub", "station", "no"}


def normalize_name(name: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", name.lower().replace("#", " "))
    tokens = [t for t in s.split() if t not in STOPWORDS]
    return " ".join(tokens)


def best_match(coned_name: str, osm_by_norm: dict[str, str], threshold: float = 0.85) -> str | None:
    norm = normalize_name(coned_name)
    if norm in osm_by_norm:
        return osm_by_norm[norm]
    scored = [(SequenceMatcher(None, norm, k).ratio(), v) for k, v in osm_by_norm.items()]
    score, geo = max(scored, default=(0, None))
    return geo if score >= threshold else None


def fetch_osm_substations() -> dict[str, str]:
    """QuackOSM pull of power=substation for the ConEd service area
    (NYC + Westchester) → {normalized_name: geojson point}.

    Untested by design (network + heavy optional dep); the matcher above is the
    tested unit. Requires `pip install -e '.[osm]'`.
    """
    from shapely.ops import unary_union

    import quackosm as qosm

    areas = ["New York City, NY", "Westchester County, NY"]
    geom = unary_union([qosm.geocode_to_geometry(a) for a in areas])
    gdf = qosm.convert_geometry_to_geodataframe(
        geometry_filter=geom,
        tags_filter={"power": "substation"},
        keep_all_tags=True,
    )
    out: dict[str, str] = {}
    for _, row in gdf.iterrows():
        tags = row.get("tags")
        name = tags.get("name") if isinstance(tags, dict) else row.get("name")
        if not name:
            continue
        out[normalize_name(str(name))] = json.dumps(row.geometry.centroid.__geo_interface__)
    return out


def match_substations(db_path: Path, osm_by_norm: dict[str, str]) -> int:
    """Persist matches in osm_substation_locations (survives re-transforms) and
    apply them to the current substations table."""
    con = duckdb.connect(str(db_path))
    try:
        con.execute(
            "CREATE TABLE IF NOT EXISTS osm_substation_locations (name VARCHAR PRIMARY KEY, geometry_geojson VARCHAR)"
        )
        names = [r[0] for r in con.execute("SELECT name FROM substations").fetchall()]
        matched = 0
        for name in names:
            geo = best_match(name, osm_by_norm)
            if geo:
                con.execute(
                    "INSERT OR REPLACE INTO osm_substation_locations VALUES (?, ?)", [name, geo]
                )
                con.execute("UPDATE substations SET geometry_geojson = ? WHERE name = ?", [geo, name])
                matched += 1
        return matched
    finally:
        con.close()


if __name__ == "__main__":
    from app.config import settings

    osm = fetch_osm_substations()
    n = match_substations(settings.DB_PATH, osm)
    print(f"Matched {n} substations against {len(osm)} OSM candidates.")
