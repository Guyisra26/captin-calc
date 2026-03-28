# Auth, DB & Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add FastAPI backend with MongoDB, JWT host login, persistent player profiles with photos, game stats collection, and an iPhone-responsive dashboard page matching the existing dark wood/gold theme.

**Architecture:** FastAPI backend (Python) sits between the React frontend and MongoDB Atlas. The frontend calls `/api/*` which Vite proxies to `localhost:8000` in dev. Auth is JWT (host-only). Spectator room stays on Firebase Realtime DB unchanged.

**Tech Stack:** FastAPI, Motor (async MongoDB), python-jose (JWT), passlib/bcrypt, React + TypeScript, Vite proxy, MongoDB Atlas free tier.

**Design doc:** `docs/plans/2026-03-28-auth-db-dashboard-design.md`

---

## Phase 1: Backend Foundation

### Task 1: Backend project scaffold

**Files:**
- Create: `backend/main.py`
- Create: `backend/db.py`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`

**Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
motor==3.5.1
pymongo==4.8.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
python-dotenv==1.0.1
pydantic==2.8.2
pytest==8.3.2
httpx==0.27.2
pytest-asyncio==0.23.8
```

**Step 2: Install dependencies**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 3: Create `backend/.env.example`**

```
MONGO_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=captincalc
JWT_SECRET=change-me-to-a-random-secret
JWT_EXPIRE_MINUTES=10080
```

Copy to `.env` and fill in real values.

**Step 4: Create `backend/db.py`**

```python
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_client: AsyncIOMotorClient | None = None

def get_db():
    return _client[os.getenv("MONGO_DB", "captincalc")]

async def connect_db():
    global _client
    _client = AsyncIOMotorClient(os.getenv("MONGO_URL"))

async def close_db():
    global _client
    if _client:
        _client.close()
```

**Step 5: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db import connect_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://localhost:5175", "http://localhost:5176",
                   "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}
```

**Step 6: Run server and verify**

```bash
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/health` — expect `{"ok": true}`.

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: scaffold FastAPI backend with MongoDB connection"
```

---

### Task 2: Auth — JWT login + create_user script

**Files:**
- Create: `backend/auth.py`
- Create: `backend/routes/auth.py`
- Create: `backend/create_user.py`
- Create: `backend/tests/test_auth.py`
- Modify: `backend/main.py`

**Step 1: Create `backend/auth.py`**

```python
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALGORITHM = "HS256"
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))

pwd_ctx = CryptContext(schemes=["bcrypt"])
bearer = HTTPBearer()

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    return decode_token(creds.credentials)
```

**Step 2: Write failing test `backend/tests/test_auth.py`**

```python
import pytest
from auth import hash_password, verify_password, create_token, decode_token

def test_password_round_trip():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)

def test_token_round_trip():
    token = create_token("user_abc")
    assert decode_token(token) == "user_abc"

def test_invalid_token_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        decode_token("not-a-token")
```

**Step 3: Run test — verify it passes**

```bash
cd backend && source venv/bin/activate
pytest tests/test_auth.py -v
```
Expected: 3 PASSED

**Step 4: Create `backend/routes/auth.py`**

```python
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from db import get_db
from auth import verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(body: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"token": create_token(str(user["_id"])), "display_name": user["display_name"]}
```

**Step 5: Create `backend/create_user.py`** (CLI script, run once per user)

```python
#!/usr/bin/env python3
"""Usage: python create_user.py <username> <password> <display_name>"""
import sys
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from auth import hash_password

load_dotenv()

async def main():
    if len(sys.argv) != 4:
        print("Usage: python create_user.py <username> <password> <display_name>")
        sys.exit(1)
    username, password, display_name = sys.argv[1], sys.argv[2], sys.argv[3]
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("MONGO_DB", "captincalc")]
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"User '{username}' already exists.")
        sys.exit(1)
    await db.users.insert_one({
        "username": username,
        "password_hash": hash_password(password),
        "display_name": display_name,
    })
    print(f"Created user '{username}' ({display_name})")
    client.close()

asyncio.run(main())
```

**Step 6: Register auth router in `main.py`**

Add to `backend/main.py`:
```python
from routes.auth import router as auth_router
app.include_router(auth_router, prefix="/api")
```

**Step 7: Create your first user**

```bash
cd backend && source venv/bin/activate
python create_user.py admin secret123 "Guy"
```

**Step 8: Test login manually**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret123"}'
```
Expected: `{"token": "...", "display_name": "Guy"}`

**Step 9: Commit**

```bash
git add backend/
git commit -m "feat: JWT auth, login endpoint, create_user script"
```

---

### Task 3: Players API

**Files:**
- Create: `backend/routes/players.py`
- Create: `backend/tests/test_players.py`
- Modify: `backend/main.py`

**Step 1: Create `backend/routes/players.py`**

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
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
```

**Step 2: Register router in `main.py`**

```python
from routes.players import router as players_router
app.include_router(players_router, prefix="/api")
```

**Step 3: Commit**

```bash
git add backend/routes/players.py backend/main.py
git commit -m "feat: players CRUD endpoints"
```

---

### Task 4: Games API + Stats

**Files:**
- Create: `backend/routes/games.py`
- Create: `backend/routes/dashboard.py`
- Modify: `backend/main.py`

**Step 1: Create `backend/routes/games.py`**

```python
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

@router.post("")
async def save_game(body: SaveGameRequest, _=Depends(get_current_user)):
    db = get_db()
    doc = {
        "date": datetime.now(timezone.utc),
        "player_ids": body.player_ids,
        "rounds": [r.model_dump() for r in body.rounds],
    }
    result = await db.game_sessions.insert_one(doc)
    return {"id": str(result.inserted_id)}
```

**Step 2: Create `backend/routes/dashboard.py`**

```python
from fastapi import APIRouter, Depends
from bson import ObjectId
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
                    # Check if this player proposed the first double
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
```

**Step 3: Register routers in `main.py`**

```python
from routes.games import router as games_router
from routes.dashboard import router as dashboard_router
app.include_router(games_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
```

**Step 4: Commit**

```bash
git add backend/routes/games.py backend/routes/dashboard.py backend/main.py
git commit -m "feat: games save endpoint and dashboard stats aggregation"
```

---

## Phase 2: Vite Proxy + API Client

### Task 5: Vite proxy + frontend API module

**Files:**
- Modify: `vite.config.ts`
- Create: `src/api.ts`

**Step 1: Add proxy to `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 2: Create `src/api.ts`**

```typescript
const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('captainCalc_jwt');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; display_name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getPlayers: () => request<{ id: string; name: string; photo_url: string | null }[]>('/players/public'),

  createPlayer: (name: string, photo_url?: string) =>
    request<{ id: string; name: string; photo_url: string | null }>('/players/public', {
      method: 'POST',
      body: JSON.stringify({ name, photo_url }),
    }),

  saveGame: (payload: { player_ids: string[]; rounds: unknown[] }) =>
    request<{ id: string }>('/games', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDashboard: () =>
    request<PlayerStats[]>('/dashboard'),
};

export interface PlayerStats {
  id: string;
  name: string;
  photo_url: string | null;
  games_played: number;
  total_balance: number;
  wins: number;
  losses: number;
  rounds_as_captain: number;
  wins_as_captain: number;
  rounds_as_teamb: number;
  wins_as_teamb: number;
  avg_stake: number;
  biggest_win: number;
  biggest_loss: number;
  captain_win_rate: number | null;
  teamb_win_rate: number | null;
  first_double_win_rate: number | null;
}
```

**Step 3: Commit**

```bash
git add vite.config.ts src/api.ts
git commit -m "feat: Vite proxy config and frontend API client"
```

---

## Phase 3: Frontend Auth

### Task 6: Login page + auth context

**Files:**
- Create: `src/components/LoginScreen.tsx`
- Create: `src/auth.ts`
- Modify: `src/App.tsx`

**Step 1: Create `src/auth.ts`**

```typescript
const TOKEN_KEY = 'captainCalc_jwt';
const NAME_KEY = 'captainCalc_displayName';

export function saveAuth(token: string, displayName: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, displayName);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getDisplayName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
```

**Step 2: Create `src/components/LoginScreen.tsx`**

```tsx
import { useState } from 'react';
import { api } from '../api';
import { saveAuth } from '../auth';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, display_name } = await api.login(username, password);
      saveAuth(token, display_name);
      onLogin();
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--wood-dark)', padding: '1.5rem' }}
    >
      <div className="w-full max-w-sm">
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '2rem',
            color: 'var(--gold-light)',
            textAlign: 'center',
            marginBottom: '2rem',
            letterSpacing: '0.04em',
          }}
        >
          ♟ Captain
        </h1>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--cream)', letterSpacing: '0.03em' }}>
            Host Login
          </h2>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            className="board-input w-full"
            autoFocus
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="board-input w-full"
            required
          />
          {error && (
            <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem' }}>{error}</p>
          )}
          <button
            type="submit"
            className="btn btn-captain w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Add auth routing to `src/App.tsx`**

At the top of `App()`, before all other logic, add:

```tsx
import { useState } from 'react'; // already imported
import LoginScreen from './components/LoginScreen';
import { isLoggedIn, clearAuth } from './auth';

// inside App():
const [loggedIn, setLoggedIn] = useState(isLoggedIn);

// Add logout to handleDispatch (for RESET_GAME):
// (existing code already handles RESET_GAME — just add clearAuth() call)

// Add at the start of the render block (before spectator check):
if (!loggedIn) {
  return <LoginScreen onLogin={() => setLoggedIn(true)} />;
}
```

Full diff for `App.tsx` — add these lines in the right places:
1. Import `LoginScreen`, `isLoggedIn`, `clearAuth` at the top
2. `const [loggedIn, setLoggedIn] = useState(isLoggedIn);` after other useState calls
3. In `handleDispatch`, inside the `RESET_GAME` block, add `clearAuth(); setLoggedIn(false);`
4. Before the spectator check: `if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;`

Note: spectators bypass login — the `if (mode === 'spectator')` block still renders without login check.

**Step 4: Test login flow manually**
- Open `http://localhost:5177`
- Should redirect to login
- Enter credentials from Task 2 Step 7
- Should proceed to game setup

**Step 5: Commit**

```bash
git add src/auth.ts src/components/LoginScreen.tsx src/App.tsx
git commit -m "feat: login screen, JWT auth, host-only access"
```

---

## Phase 4: Player Selection in SetupScreen

### Task 7: Registered vs new player toggle in setup

**Files:**
- Modify: `src/components/SetupScreen.tsx`

**Step 1: Add registered player state to SetupScreen**

In `SetupScreen`, each player entry needs a `playerId` (if registered) and `photoUrl`. Extend `PlayerEntry`:

```typescript
interface PlayerEntry {
  id: string;            // local UUID for React key
  name: string;
  playerId?: string;     // MongoDB player _id (if registered)
  photoUrl?: string;
  isRegistered: boolean;
}
```

**Step 2: Fetch registered players on mount**

```typescript
import { useEffect, useState } from 'react';
import { api } from '../api';

// inside SetupScreen:
const [registeredPlayers, setRegisteredPlayers] = useState<{ id: string; name: string; photo_url: string | null }[]>([]);

useEffect(() => {
  api.getPlayers().then(setRegisteredPlayers).catch(() => {});
}, []);
```

**Step 3: Update player entry UI in `step === 'names'`**

For each player row, replace the plain text input with a toggle:

```tsx
{/* Toggle: registered or new */}
<div className="flex gap-1 mb-1">
  <button
    type="button"
    onClick={() => toggleRegistered(p.id, true)}
    className={`btn text-xs px-2 py-1 ${p.isRegistered ? 'btn-captain' : 'btn-ghost'}`}
  >
    Registered
  </button>
  <button
    type="button"
    onClick={() => toggleRegistered(p.id, false)}
    className={`btn text-xs px-2 py-1 ${!p.isRegistered ? 'btn-captain' : 'btn-ghost'}`}
  >
    New
  </button>
</div>

{p.isRegistered ? (
  <select
    value={p.playerId ?? ''}
    onChange={e => selectRegisteredPlayer(p.id, e.target.value)}
    className="board-input flex-1"
  >
    <option value="">Select player...</option>
    {registeredPlayers.map(rp => (
      <option key={rp.id} value={rp.id}>{rp.name}</option>
    ))}
  </select>
) : (
  <input
    type="text"
    value={p.name}
    onChange={e => updateName(p.id, e.target.value)}
    placeholder={`Player ${i + 1}`}
    className="board-input flex-1"
  />
)}
```

**Step 4: Add helper functions**

```typescript
const toggleRegistered = (id: string, isRegistered: boolean) => {
  setPlayers(players.map(p => p.id === id ? { ...p, isRegistered, name: '', playerId: undefined } : p));
};

const selectRegisteredPlayer = (id: string, playerId: string) => {
  const rp = registeredPlayers.find(r => r.id === playerId);
  setPlayers(players.map(p => p.id === id ? { ...p, playerId, name: rp?.name ?? '' } : p));
};
```

Default `isRegistered` to `true` if there are registered players, `false` otherwise.

**Step 5: Update initial state**

```typescript
const [players, setPlayers] = useState<PlayerEntry[]>([
  { id: crypto.randomUUID(), name: '', isRegistered: true },
  { id: crypto.randomUUID(), name: '', isRegistered: true },
]);
```

**Step 6: Commit**

```bash
git add src/components/SetupScreen.tsx
git commit -m "feat: registered vs new player selection in setup"
```

---

## Phase 5: Save Game to Backend

### Task 8: Post completed game to backend + auto-register new players

**Files:**
- Modify: `src/App.tsx`

**Step 1: Intercept RESOLVE_ROUND in `handleDispatch`**

After a round resolves and the game ends (last round complete), POST to `/api/games`. But we don't know "game end" — instead, save after every `RESOLVE_ROUND` so partial games are also tracked. Actually, save the full game when the user navigates back to setup (RESET_GAME) or at the end of each round.

Simpler: save a game session after each `RESOLVE_ROUND`. Each session is a list of rounds played so far. The backend upserts by a `session_id`.

Even simpler for now: track a `sessionId` in React state. On `START_GAME`, generate it. On each `RESOLVE_ROUND`, POST the full round to a `POST /api/games/round` endpoint.

**Actually — simplest correct approach:** Post the full game when `RESET_GAME` is dispatched (game ends). At that point, `state.roundHistory` has all rounds.

Modify `handleDispatch` in `App.tsx`:

```typescript
import { api } from './api';
import { getToken } from './auth';

// Inside handleDispatch, before dispatch(action):
if (action.type === 'RESET_GAME' && getToken() && state.roundHistory.length > 0) {
  // Build player_ids from game state
  const playerIdMap = ...; // see Step 2

  api.saveGame({
    player_ids: ...,
    rounds: state.roundHistory.map(r => ({
      round_number: r.roundNumber,
      captain_id: playerIdMap[r.captainId] ?? r.captainId,
      representative_id: playerIdMap[r.representativeId] ?? r.representativeId,
      winner: r.winner,
      win_type: r.winType,
      final_stake: r.finalPerPlayerStake,
      doublings: r.doublings,
      first_doubler: null, // TODO: track this in round events
      removed_player_ids: r.removals.map(name => /* reverse lookup */ ''),
      balance_changes: r.balanceChanges,
    })),
  }).catch(console.error);
}
```

**Step 2: Track MongoDB player IDs in game state**

The cleanest way: when `START_GAME` is dispatched from `SetupScreen`, pass `playerMongoIds` as an extra field. Store in App state (not in game reducer — it's UI concern).

In `App.tsx`, add:
```typescript
const [playerMongoIds, setPlayerMongoIds] = useState<Record<string, string>>({});
// gamePlayerId -> mongoPlayerId
```

In `handleStartGame`, after dispatch:
```typescript
setPlayerMongoIds(mongoIdMap); // passed from SetupScreen
```

Update `SetupScreen`'s `onStartGame` prop signature to include `mongoIdMap`:
```typescript
onStartGame: (
  players: { id: string; name: string }[],
  captainId: string,
  teamBOrder: string[],
  initialBalances?: Record<string, number>,
  mongoIdMap?: Record<string, string>
) => void;
```

In `SetupScreen.handleStartFresh` / `handleStartResume`:
- For registered players: `mongoIdMap[p.id] = p.playerId`
- For new players: call `api.createPlayer(p.name)` first, then `mongoIdMap[p.id] = result.id`

**Step 3: Commit**

```bash
git add src/App.tsx src/components/SetupScreen.tsx
git commit -m "feat: save completed game to backend, auto-register new players"
```

---

## Phase 6: Dashboard Page

### Task 9: Dashboard route + page

**Files:**
- Create: `src/components/DashboardScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/GameScreen.tsx` (add dashboard nav button)

**Step 1: Add dashboard screen state to App**

In `App.tsx`, add a simple view state:

```typescript
type View = 'game' | 'dashboard';
const [view, setView] = useState<View>('game');
```

In render, before existing screen logic:
```typescript
if (loggedIn && view === 'dashboard') {
  return <DashboardScreen onBack={() => setView('game')} />;
}
```

**Step 2: Add dashboard button to GameScreen top bar**

In `GameScreen.tsx`, add to the hamburger menu:
```tsx
<button
  onClick={() => { onOpenDashboard(); setMenuOpen(false); }}
  style={menuItemStyle}
>
  ♟ Dashboard
</button>
```

Pass `onOpenDashboard` as prop from App.

**Step 3: Create `src/components/DashboardScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { api, PlayerStats } from '../api';

interface Props {
  onBack: () => void;
}

function StatBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0.4rem 0.75rem',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.07)',
      minWidth: '70px',
    }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: color ?? 'var(--cream)' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.65rem', color: 'var(--cream-dark)', opacity: 0.6, textAlign: 'center', marginTop: '2px' }}>
        {label}
      </span>
    </div>
  );
}

function PlayerCard({ s, rank }: { s: PlayerStats; rank: number }) {
  const [open, setOpen] = useState(false);
  const balColor = s.total_balance > 0 ? 'var(--color-positive)' : s.total_balance < 0 ? 'var(--color-negative)' : 'var(--cream-dark)';

  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={() => setOpen(v => !v)}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold-dark)', minWidth: '1.5rem' }}>
          {rank}.
        </span>

        {/* Photo or initial */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(200,150,40,0.15)',
          border: '1px solid rgba(200,150,40,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {s.photo_url
            ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: 'var(--gold)', fontSize: '1rem' }}>
                {s.name[0]?.toUpperCase()}
              </span>
          }
        </div>

        {/* Name + balance */}
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--cream)' }}>{s.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cream-dark)', opacity: 0.6 }}>
            {s.games_played} game{s.games_played !== 1 ? 's' : ''}
          </div>
        </div>

        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.3rem', color: balColor }}>
          {s.total_balance > 0 ? '+' : ''}{s.total_balance}
        </span>
      </div>

      {/* Expanded stats */}
      {open && (
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <StatBadge label="W/L" value={`${s.wins}/${s.losses}`} />
          <StatBadge
            label="As CPT"
            value={s.captain_win_rate !== null ? `${Math.round(s.captain_win_rate * 100)}%` : '—'}
            color="var(--gold)"
          />
          <StatBadge
            label="As B"
            value={s.teamb_win_rate !== null ? `${Math.round(s.teamb_win_rate * 100)}%` : '—'}
          />
          <StatBadge label="Avg Stake" value={String(s.avg_stake)} />
          <StatBadge label="Best" value={s.biggest_win > 0 ? `+${s.biggest_win}` : '—'} color="var(--color-positive)" />
          <StatBadge label="Worst" value={s.biggest_loss < 0 ? String(s.biggest_loss) : '—'} color="var(--color-negative)" />
          {s.first_double_win_rate !== null && (
            <StatBadge
              label="1st Double"
              value={`${Math.round(s.first_double_win_rate * 100)}%`}
              color="var(--gold-light)"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardScreen({ onBack }: Props) {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--wood-darkest)' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
        }}
      >
        <button onClick={onBack} className="btn btn-ghost px-3 py-1.5 text-sm">← Back</button>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: '1.1rem',
          color: 'var(--gold-light)', letterSpacing: '0.04em',
        }}>
          ♟ Dashboard
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--wood-dark)' }}>
        {loading && (
          <p style={{ color: 'var(--cream-dark)', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
            Loading stats...
          </p>
        )}
        {error && (
          <p style={{ color: 'var(--color-negative)', textAlign: 'center', marginTop: '2rem' }}>{error}</p>
        )}
        {!loading && !error && stats.length === 0 && (
          <p style={{ color: 'var(--cream-dark)', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
            No games played yet.
          </p>
        )}
        <div className="space-y-2 max-w-lg mx-auto">
          {stats.map((s, i) => (
            <PlayerCard key={s.id} s={s} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/DashboardScreen.tsx src/App.tsx src/components/GameScreen.tsx
git commit -m "feat: dashboard page with player stats cards"
```

---

## Phase 7: MongoDB Atlas Setup (one-time)

### Task 10: Configure MongoDB Atlas

**Step 1:** Go to [cloud.mongodb.com](https://cloud.mongodb.com), create a free M0 cluster.

**Step 2:** Create a database user and whitelist your IP (or `0.0.0.0/0` for dev).

**Step 3:** Copy the connection string into `backend/.env` as `MONGO_URL`.

**Step 4:** Create indexes in MongoDB Atlas console (or via mongosh):

```javascript
db.game_sessions.createIndex({ "player_ids": 1 });
db.players.createIndex({ "name": 1 });
db.users.createIndex({ "username": 1 }, { unique: true });
```

**Step 5:** Create your host user:

```bash
cd backend && source venv/bin/activate
python create_user.py yourusername yourpassword "Your Name"
```

---

## Running the Full Stack

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd .. && npm run dev -- --port 5177
```

Open `http://localhost:5177`.
