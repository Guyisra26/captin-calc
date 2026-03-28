from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from db import get_db
from auth import get_current_user

router = APIRouter(prefix="/games", tags=["games"])

class RoundData(BaseModel):
    round_number: int
    captain_id: str
    representative_id: str
    winner: str  # "captain" | "teamB"
    win_type: str  # "normal" | "mars" | "turkish"
    final_stake: float
    doublings: int
    first_doubler: str | None  # "captain" | "teamB" | None
    removed_player_ids: list[str]
    balance_changes: dict[str, float]

class SaveGameRequest(BaseModel):
    player_ids: list[str]
    rounds: list[RoundData]

@router.post("", status_code=201)
async def save_game(body: SaveGameRequest, _=Depends(get_current_user)):
    db = get_db()
    doc = {
        "date": datetime.now(timezone.utc),
        "player_ids": body.player_ids,
        "rounds": [r.model_dump() for r in body.rounds],
    }
    result = await db.game_sessions.insert_one(doc)
    return {"id": str(result.inserted_id)}
