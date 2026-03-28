from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db import get_db
from auth import get_current_user

router = APIRouter(prefix="/players", tags=["players"])

def _fmt(p: dict) -> dict:
    return {"id": str(p["_id"]), "name": p["name"], "photo_url": p.get("photo_url")}

class CreatePlayerRequest(BaseModel):
    name: str
    photo_url: str | None = None

@router.get("")
async def list_players(_=Depends(get_current_user)):
    db = get_db()
    players = await db.players.find().sort("name", 1).to_list(200)
    return [_fmt(p) for p in players]

@router.get("/public")
async def list_players_public():
    """No auth required — used during game setup."""
    db = get_db()
    players = await db.players.find().sort("name", 1).to_list(200)
    return [_fmt(p) for p in players]

@router.post("")
async def create_player(body: CreatePlayerRequest, _=Depends(get_current_user)):
    db = get_db()
    result = await db.players.insert_one({"name": body.name, "photo_url": body.photo_url})
    return {"id": str(result.inserted_id), "name": body.name, "photo_url": body.photo_url}

@router.post("/public")
async def create_player_public(body: CreatePlayerRequest):
    """No auth required — called when a new player is added during game setup."""
    db = get_db()
    result = await db.players.insert_one({"name": body.name, "photo_url": body.photo_url})
    return {"id": str(result.inserted_id), "name": body.name, "photo_url": body.photo_url}
