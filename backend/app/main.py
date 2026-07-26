from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import feeders, substations

app = FastAPI(title="MeanderX — ConEd Hosting Capacity API")
app.include_router(feeders.router)
app.include_router(substations.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


_static = Path(__file__).resolve().parents[2] / "frontend" / "out"
if _static.exists():
    app.mount("/", StaticFiles(directory=_static, html=True), name="frontend")
