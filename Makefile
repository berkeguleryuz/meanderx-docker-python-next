.PHONY: run run-local ingest test dev

run:
	docker compose up --build

run-local:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -q -e '.[dev]'
	cd frontend && npm install --silent && npm run build
	@[ -f data/meanderx.duckdb ] || (cd backend && .venv/bin/python -m ingest.run_ingest)
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $${PORT:-8000}

ingest:
	cd backend && .venv/bin/python -m ingest.run_ingest

test:
	cd backend && .venv/bin/python -m pytest -v
	cd frontend && npx vitest run

dev:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
