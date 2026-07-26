import duckdb

from app.config import settings

DB_PATH_OVERRIDE = None


def get_con() -> duckdb.DuckDBPyConnection:
    path = DB_PATH_OVERRIDE or settings.DB_PATH
    return duckdb.connect(str(path), read_only=True)
