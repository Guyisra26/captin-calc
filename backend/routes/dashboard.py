from fastapi import APIRouter, Depends
from db import get_db
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("")
async def get_dashboard(_=Depends(get_current_user)):
    db = get_db()
    players = await db.players.find().to_list(200)
    games = await db.game_sessions.find().to_list(1000)

    stats: dict[str, dict] = {}
    for p in players:
        pid = str(p["_id"])
        stats[pid] = {
            "id": pid,
            "name": p["name"],
            "photo_url": p.get("photo_url"),
            "games_played": 0,
            "total_balance": 0.0,
            "wins": 0,
            "losses": 0,
            "rounds_as_captain": 0,
            "wins_as_captain": 0,
            "rounds_as_teamb": 0,
            "wins_as_teamb": 0,
            "total_stake": 0.0,
            "rounds_played": 0,
            "biggest_win": 0.0,
            "biggest_loss": 0.0,
            "first_double_rounds": 0,
            "first_double_wins": 0,
        }

    for game in games:
        game_player_ids = set(game.get("player_ids", []))
        for pid in game_player_ids:
            if pid in stats:
                stats[pid]["games_played"] += 1

        for r in game.get("rounds", []):
            balance_changes: dict = r.get("balance_changes", {})
            captain_id: str = r.get("captain_id", "")
            winner: str = r.get("winner", "")
            first_doubler: str | None = r.get("first_doubler")

            for pid, change in balance_changes.items():
                if pid not in stats:
                    continue
                s = stats[pid]
                s["total_balance"] += change
                s["rounds_played"] += 1
                s["total_stake"] += r.get("final_stake", 0)
                s["biggest_win"] = max(s["biggest_win"], change)
                s["biggest_loss"] = min(s["biggest_loss"], change)

                if change > 0:
                    s["wins"] += 1
                elif change < 0:
                    s["losses"] += 1

                if pid == captain_id:
                    s["rounds_as_captain"] += 1
                    if winner == "captain":
                        s["wins_as_captain"] += 1
                else:
                    s["rounds_as_teamb"] += 1
                    if winner == "teamB":
                        s["wins_as_teamb"] += 1

                if first_doubler:
                    is_captain = pid == captain_id
                    proposed = (first_doubler == "captain" and is_captain) or \
                               (first_doubler == "teamB" and not is_captain)
                    if proposed:
                        s["first_double_rounds"] += 1
                        if (first_doubler == "captain" and winner == "captain") or \
                           (first_doubler == "teamB" and winner == "teamB"):
                            s["first_double_wins"] += 1

    result = []
    for s in stats.values():
        rp = s["rounds_played"]
        result.append({
            **s,
            "avg_stake": round(s["total_stake"] / rp, 2) if rp > 0 else 0,
            "captain_win_rate": round(s["wins_as_captain"] / s["rounds_as_captain"], 3)
                if s["rounds_as_captain"] > 0 else None,
            "teamb_win_rate": round(s["wins_as_teamb"] / s["rounds_as_teamb"], 3)
                if s["rounds_as_teamb"] > 0 else None,
            "first_double_win_rate": round(s["first_double_wins"] / s["first_double_rounds"], 3)
                if s["first_double_rounds"] > 0 else None,
        })

    result.sort(key=lambda x: x["total_balance"], reverse=True)
    return result
