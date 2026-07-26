from fastapi import APIRouter, Depends, HTTPException

from app import queries
from app.db import get_con

router = APIRouter(prefix="/api/substations", tags=["substations"])


@router.get("")
def list_substations(search: str = "", limit: int = 20, con=Depends(get_con)):
    return queries.search_substations(con, search, limit)


@router.get("/{name}")
def substation_detail(name: str, con=Depends(get_con)):
    sub = queries.get_substation(con, name)
    if sub is None:
        raise HTTPException(404, f"Substation '{name}' not found")
    return sub
