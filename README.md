# ConEd Hosting Capacity Explorer

Query Con Edison's solar hosting capacity data in a customer friendly way: search any feeder or substation, see available capacity (MW), the interconnection queue, geometry on a 3D map, and how the data changes over time. Data is ingested from the public ArcGIS FeatureServer into snapshot-versioned local storage (DuckDB), so history survives even though the source wipes old data on every refresh.

Stack: FastAPI + DuckDB backend, Next.js + MapLibre GL frontend, one container.

## Run it

With Docker (recommended, nothing else to install):

```bash
make run          # or: docker compose up --build
```

First boot ingests about 165k features from the live ConEd API (a few minutes, needs internet). Then open:

- UI: http://localhost:8000
- API docs: http://localhost:8000/docs

Data persists in a Docker volume, so later boots start instantly. Fresh snapshot: `docker compose exec app python -m ingest.run_ingest`. Reset everything: `docker compose down -v`.

Without Docker (needs Python 3.12+ and Node 20+):

```bash
make run-local
```

## Optional: substation locations from OpenStreetMap

The app works fully without this step (all 30 substations get a location estimated from their feeders' geometry). Running it upgrades 21 of them to surveyed OSM points:

```bash
cd backend && .venv/bin/pip install -e '.[osm]' && .venv/bin/python -m ingest.osm_substations
```

## Tests

```bash
make test         # 23 backend (pytest) + 10 frontend (vitest)
```

## Highlights

- 3D map by default (2D one tab away), cinematic 3D tours of any feeder or substation
- Sortable substation and feeder explorer with live values and progress bars
- SCD2 history per feeder: GET /api/feeders/{id}/history
- Raw parquet snapshot per ingest; content-hashed, atomic, idempotent
