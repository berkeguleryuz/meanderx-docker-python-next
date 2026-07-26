import os
from pathlib import Path


class Settings:
    ARCGIS_BASE_URL: str = os.environ.get(
        "ARCGIS_BASE_URL",
        "https://services.arcgis.com/ciPnsNFi1JLWVjva/arcgis/rest/services/CECONY_NodalHCV_Prod/FeatureServer",
    )
    DATA_DIR: Path = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))

    @property
    def DB_PATH(self) -> Path:
        return self.DATA_DIR / "meanderx.duckdb"

    @property
    def SNAPSHOT_DIR(self) -> Path:
        return self.DATA_DIR / "snapshots"


settings = Settings()
