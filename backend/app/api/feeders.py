from fastapi import APIRouter, Depends, HTTPException

from app import queries
from app.db import get_con

router = APIRouter(prefix="/api/feeders", tags=["feeders"])


@router.get("")
def list_feeders(search: str = "", limit: int = 20, sort: str = "id", con=Depends(get_con)):
    """sort: id | capacity (available MW desc) | queued | connected"""
    return queries.search_feeders(con, search, min(limit, 2000), sort)


@router.get("/{feeder_id}")
def feeder_detail(feeder_id: str, con=Depends(get_con)):
    feeder = queries.get_feeder(con, feeder_id)
    if feeder is None:
        raise HTTPException(404, f"Feeder '{feeder_id}' not found")
    return feeder


@router.get("/{feeder_id}/history")
def feeder_history(feeder_id: str, con=Depends(get_con)):
    if queries.get_feeder(con, feeder_id) is None:
        raise HTTPException(404, f"Feeder '{feeder_id}' not found")
    return queries.get_feeder_history(con, feeder_id)
