# Auth, Database & Dashboard — Design Document

**Date:** 2026-03-28

---

## Overview

Add player profiles, persistent stats, JWT-based host login, and a stats dashboard to Captain Calculator. Spectators retain their existing live-game view with no changes.

---

## Architecture

```
React Frontend (Vite)
      ↕ HTTP + JWT
FastAPI Backend (Python)
      ↕
MongoDB Atlas (free tier)

Firebase Realtime DB — stays for spectator room only (unchanged)
```

---

## Auth

- Only the **host** logs in. Spectators never need an account.
- Login: `POST /auth/login` with `{ username, password }` → returns JWT.
- JWT stored in `localStorage`, attached as `Authorization: Bearer <token>` header on every API request.
- Admin creates host accounts via a CLI script (`create_user.py`) — no UI needed.
- Protected routes in React: `/dashboard` redirects to `/login` if no valid JWT.
- Spectator share-room link works exactly as today — live game view only, no stats access.

---

## MongoDB Collections

### `players`
Everyone who has ever played. No login required.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "photo_url": "string | null",
  "created_at": "datetime"
}
```

### `users`
Host accounts only (for now: just the admin).
```json
{
  "_id": "ObjectId",
  "username": "string",
  "password_hash": "string (bcrypt)",
  "display_name": "string"
}
```

### `game_sessions`
One document per completed game.
```json
{
  "_id": "ObjectId",
  "date": "datetime",
  "player_ids": ["ObjectId"],
  "rounds": [
    {
      "round_number": 1,
      "captain_id": "ObjectId",
      "representative_id": "ObjectId",
      "winner": "captain | teamB",
      "win_type": "normal | mars | turkish",
      "final_stake": 4,
      "doublings": 2,
      "first_doubler": "captain | teamB | null",
      "removed_player_ids": ["ObjectId"],
      "balance_changes": { "<player_id>": -4, "<player_id>": 4 }
    }
  ]
}
```

Stats are computed from `game_sessions` at query time — no denormalization needed for 5–6 players.

---

## Stats Per Player

Computed via aggregation over `game_sessions`:

| Stat | Description |
|------|-------------|
| Total balance | Sum of all `balance_changes` across all games |
| Games played | Count of games containing this player |
| Wins / Losses | Overall round wins and losses |
| Win rate as Captain | Rounds won ÷ rounds played as captain |
| Win rate as Team B | Rounds won ÷ rounds played as Team B |
| Average stake | Mean of `final_stake` across all rounds played |
| Biggest win | Max single `balance_change` in one round |
| Biggest loss | Min single `balance_change` in one round |
| First-doubler win rate | Rounds won when player proposed the first double |

---

## Game Setup Flow (Player Selection)

Each player slot in `SetupScreen` gets a toggle:

- **Registered player** → dropdown of all `players` from DB
- **New player** → name input + optional photo upload

After the game ends, any "new player" is automatically saved to the `players` collection. Next time they appear in the registered dropdown.

If the app is offline or the backend is unavailable, setup falls back to manual name entry (no stats tracked for that game).

---

## FastAPI Backend

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Username + password → JWT |
| GET | `/players` | List all players (name + photo) |
| POST | `/players` | Create new player |
| GET | `/players/{id}/stats` | Stats for one player |
| GET | `/dashboard` | Aggregated stats for all players |
| POST | `/games` | Save completed game session |

### Structure
```
backend/
├── main.py
├── auth.py          # JWT logic, password hashing
├── models.py        # Pydantic schemas
├── db.py            # MongoDB connection (motor async)
├── routes/
│   ├── auth.py
│   ├── players.py
│   └── games.py
└── create_user.py   # CLI script to add host accounts
```

---

## Dashboard Page

- Route: `/dashboard` (protected — redirect to `/login` if no JWT)
- **Design:** matches existing app — dark wood background, gold accents, Cinzel font, same card/badge components
- **Responsive:** iPhone-first layout (single column), tablet/desktop expands to grid
- **Sections:**
  1. **Leaderboard** — players ranked by total balance, with win rate badges
  2. **Player Cards** — expandable card per player showing full stat breakdown
  3. **Fun Facts** — e.g. "Guy wins 80% when he doubles first"

---

## What Does NOT Change

- Firebase Realtime DB spectator room — untouched
- Firebase logging (`logGameStart`, `logRoundComplete`, etc.) — untouched
- Local game flow — fully functional offline (stats just won't be saved)
- Undo, persistence (localStorage), all existing features — untouched
