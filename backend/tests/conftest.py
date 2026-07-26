import pytest
from fastapi.testclient import TestClient

from ingest.snapshot import write_snapshot
from ingest.transform import run_transform
from tests.test_transform import rows


@pytest.fixture()
def client(tmp_path):
    sid = write_snapshot(rows(), tmp_path)
    db = tmp_path / "test.duckdb"
    run_transform(db, tmp_path, sid)
    import app.db
    import app.main

    app.db.DB_PATH_OVERRIDE = db
    try:
        yield TestClient(app.main.app)
    finally:
        app.db.DB_PATH_OVERRIDE = None
