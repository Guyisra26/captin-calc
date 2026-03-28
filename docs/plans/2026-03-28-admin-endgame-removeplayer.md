# Admin Dashboard, End Game Stats & Remove Player — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three features to Captain Calculator: admin dashboard for user management, end-game stats screen with Recharts charts, and remove-player with zero-sum balance redistribution.

**Architecture:** Features A → B → C are executed sequentially (shared files: App.tsx, GameScreen.tsx). Each is a complete vertical slice. Feature B assumes A is already merged. Feature C assumes B is already merged. Always read a file before editing it.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind (frontend), FastAPI + Motor + MongoDB Atlas (backend), Recharts (Feature B).

---

## Feature A: Admin Dashboard

### Task A1: Backend — `get_admin_user`, admin routes, envs, test

**Files:**
- Modify: `backend/auth.py`
- Create: `backend/routes/admin.py`
- Modify: `backend/main.py`
- Modify: `backend/.env`
- Modify: `backend/.env.example`
- Create: `backend/tests/test_admin.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_admin.py
import pytest
from fastapi import HTTPException

def test_get_admin_user_allows_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    import asyncio
    from auth import get_admin_user
    result = asyncio.run(get_admin_user("admin"))
    assert result == "admin"

def test_get_admin_user_blocks_non_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    import asyncio
    from auth import get_admin_user
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_admin_user("alice"))
    assert exc.value.status_code == 403

def test_get_admin_user_blocks_empty_env(monkeypatch):
    monkeypatch.delenv("ADMIN_USERNAME", raising=False)
    import asyncio
    from auth import get_admin_user
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_admin_user("admin"))
    assert exc.value.status_code == 403
```

**Step 2: Run test — expect FAIL**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc/backend
pytest tests/test_admin.py -v
```

Expected: `ImportError: cannot import name 'get_admin_user' from 'auth'`

**Step 3: Add `get_admin_user` to `backend/auth.py`**

Append after the last line of `backend/auth.py`:

```python
async def get_admin_user(username: str = Depends(get_current_user)) -> str:
    admin = os.getenv("ADMIN_USERNAME", "")
    if not admin or username != admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return username
```

**Step 4: Run test — expect PASS**

```bash
pytest tests/test_admin.py -v
```

Expected: 3 tests PASS

**Step 5: Create `backend/routes/admin.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db import get_db
from auth import get_admin_user, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    username: str
    display_name: str
    password: str


@router.get("/users")
async def list_users(_: str = Depends(get_admin_user)):
    db = get_db()
    users = await db.users.find({}, {"password_hash": 0}).to_list(None)
    return [
        {"id": str(u["_id"]), "username": u["username"], "display_name": u["display_name"]}
        for u in users
    ]


@router.post("/users", status_code=201)
async def create_user(body: CreateUserRequest, _: str = Depends(get_admin_user)):
    db = get_db()
    existing = await db.users.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    await db.users.insert_one({
        "username": body.username,
        "display_name": body.display_name,
        "password_hash": hash_password(body.password),
    })
    return {"ok": True}
```

**Step 6: Register admin router in `backend/main.py`**

Add import after the existing router imports:
```python
from routes.admin import router as admin_router
```

Add after the existing `app.include_router(dashboard_router, prefix="/api")`:
```python
app.include_router(admin_router, prefix="/api")
```

**Step 7: Add env vars**

In `backend/.env`, add a new line:
```
ADMIN_USERNAME=admin
```

In `backend/.env.example`, add a new line:
```
ADMIN_USERNAME=your-admin-username
```

**Step 8: Verify server starts**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc/backend
uvicorn main:app --reload --port 8000
```

Expected: server starts, no errors. Check `http://localhost:8000/docs` — should show `/api/admin/users` endpoints.

**Step 9: Commit**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc
git add backend/auth.py backend/routes/admin.py backend/main.py backend/.env.example backend/tests/test_admin.py
git commit -m "feat: add admin backend — get_admin_user dependency + /api/admin/users endpoints"
```

Note: do NOT add `backend/.env` to git (it has real credentials).

---

### Task A2: Frontend — api.ts additions + AdminScreen component

**Files:**
- Modify: `src/api.ts`
- Create: `src/components/AdminScreen.tsx`

**Step 1: Add admin methods to `src/api.ts`**

Read `src/api.ts` first. Add these two methods inside the `api` object, after `getDashboard`:

```typescript
  getAdminUsers: () =>
    request<{ id: string; username: string; display_name: string }[]>('/admin/users'),

  createAdminUser: (data: { username: string; display_name: string; password: string }) =>
    request<{ ok: boolean }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
```

**Step 2: Create `src/components/AdminScreen.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import DashboardScreen from './DashboardScreen';

interface Props {
  onBack: () => void;
}

type Tab = 'users' | 'stats';

interface UserRecord {
  id: string;
  username: string;
  display_name: string;
}

export default function AdminScreen({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [form, setForm] = useState({ username: '', display_name: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    setFetchError('');
    api.getAdminUsers()
      .then(setUsers)
      .catch(() => setFetchError('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.display_name || !form.password) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.createAdminUser(form);
      setForm({ username: '', display_name: '', password: '' });
      loadUsers();
    } catch {
      setCreateError('Failed to create user (username may already exist)');
    } finally {
      setCreating(false);
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: '0.5rem 1.25rem',
        background: tab === t ? 'rgba(200,150,40,0.15)' : 'none',
        border: 'none',
        borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
        color: tab === t ? 'var(--gold-light)' : 'var(--cream-dark)',
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    color: 'var(--cream)',
    fontSize: '0.9rem',
    width: '100%',
  };

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
        <button onClick={onBack} className="btn btn-ghost px-3 py-1.5 text-sm">
          ← Back
        </button>
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '1.1rem',
            color: 'var(--gold-light)',
            letterSpacing: '0.04em',
          }}
        >
          ⚙ Admin
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'var(--wood-dark)', flexShrink: 0 }}>
        {tabBtn('users', 'Users')}
        {tabBtn('stats', 'Stats')}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'stats' ? (
          <DashboardScreen onBack={() => setTab('users')} />
        ) : (
          <div className="p-3 space-y-4 max-w-lg mx-auto">
            {/* Create user form */}
            <div className="card">
              <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                Create User
              </h2>
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  style={inputStyle}
                  placeholder="Username (for login)"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Display name"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                {createError && (
                  <p style={{ color: 'var(--color-negative)', fontSize: '0.8rem' }}>{createError}</p>
                )}
                <button
                  type="submit"
                  disabled={creating || !form.username || !form.display_name || !form.password}
                  className={`btn btn-captain w-full py-2 ${creating || !form.username || !form.display_name || !form.password ? 'btn-disabled' : ''}`}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>

            {/* User list */}
            <div className="card">
              <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                All Users
              </h2>
              {loading && (
                <p style={{ color: 'var(--cream-dark)', opacity: 0.5, fontSize: '0.85rem' }}>Loading...</p>
              )}
              {fetchError && (
                <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem' }}>{fetchError}</p>
              )}
              <div className="space-y-1">
                {users.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ color: 'var(--cream)', fontSize: '0.9rem' }}>{u.display_name}</span>
                    <span style={{ color: 'var(--cream-dark)', opacity: 0.5, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {u.username}
                    </span>
                  </div>
                ))}
                {!loading && users.length === 0 && !fetchError && (
                  <p style={{ color: 'var(--cream-dark)', opacity: 0.4, fontSize: '0.85rem' }}>No users found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc
npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/api.ts src/components/AdminScreen.tsx
git commit -m "feat: admin frontend — AdminScreen component + api.ts admin methods"
```

---

### Task A3: Wire admin into App.tsx + GameScreen.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/GameScreen.tsx`
- Create: `.env.local` (project root)

**Step 1: Create root `.env.local`**

Create the file `/Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc/.env.local`:

```
VITE_ADMIN_USERNAME=admin
```

This file is gitignored (Vite ignores `.env.local` by default and it's typically in `.gitignore`).

**Step 2: Edit `src/App.tsx`**

Read the file first. Make these changes:

a) Add import for `AdminScreen` after the `DashboardScreen` import:
```typescript
import AdminScreen from './components/AdminScreen';
```

b) Change the `View` type (line ~113):
```typescript
// Before:
type View = 'game' | 'dashboard';
// After:
type View = 'game' | 'dashboard' | 'admin';
```

c) Add `isAdmin` after the `setView` useState call (line ~114):
```typescript
const isAdmin = getDisplayName() === import.meta.env.VITE_ADMIN_USERNAME;
```

d) Add admin view block after the dashboard view block (after `if (loggedIn && view === 'dashboard')`):
```typescript
if (loggedIn && view === 'admin') {
  return <AdminScreen onBack={() => setView('game')} />;
}
```

e) In the `<GameScreen>` render (both the spectator one and the local/host one), add `onOpenAdmin` prop:
- Spectator GameScreen: `onOpenAdmin={undefined}` (spectators can't access admin)
- Local/Host GameScreen: `onOpenAdmin={isAdmin ? () => setView('admin') : undefined}`

**Step 3: Edit `src/components/GameScreen.tsx`**

Read the file first. Make these changes:

a) Add `onOpenAdmin?: () => void` to the `GameScreenProps` interface (after `onOpenDashboard`):
```typescript
onOpenAdmin?: () => void;
```

b) Destructure it in the function signature (after `onOpenDashboard`):
```typescript
export default function GameScreen({ state, dispatch, onUndo, canUndo, mode, roomCode, onCreateRoom, onOpenDashboard, onOpenAdmin }: GameScreenProps) {
```

c) Add the Admin button inside the hamburger dropdown, just before the existing "📊 Dashboard" button:
```tsx
{onOpenAdmin && (
  <button
    onClick={() => { onOpenAdmin(); setMenuOpen(false); }}
    style={{ ...menuItemStyle, color: 'var(--gold-light)' }}
  >
    ⚙ Admin
  </button>
)}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 5: Manual smoke test**

1. Start backend: `cd backend && uvicorn main:app --reload --port 8000`
2. Start frontend: `cd .. && npm run dev`
3. Login as `admin` user (create one first via `python create_user.py admin Admin`)
4. Open hamburger menu — should see "⚙ Admin" button
5. Click Admin — opens AdminScreen
6. Create a test user via the form
7. Switch to Stats tab — shows dashboard data
8. Back button returns to game

**Step 6: Commit**

```bash
git add src/App.tsx src/components/GameScreen.tsx
git commit -m "feat: wire admin dashboard to App — view routing, hamburger button, admin detection"
```

---

## Feature B: End Game Stats Screen

> **Assumption:** Feature A is already implemented and committed.

### Task B1: Install Recharts + create GameSummaryScreen

**Files:**
- Run: `npm install recharts`
- Create: `src/components/GameSummaryScreen.tsx`

**Step 1: Install recharts**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc
npm install recharts
```

Expected: recharts added to package.json, no peer dependency errors

**Step 2: Create `src/components/GameSummaryScreen.tsx`**

```tsx
import { useMemo } from 'react';
import type { GameState } from '../types';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import RoundHistory from './RoundHistory';

const COLORS = ['#c8923a', '#4fc84a', '#e05555', '#5599e0', '#e0c044', '#a855f7'];

interface Props {
  state: GameState;
  onNewGame: () => void;
}

export default function GameSummaryScreen({ state, onNewGame }: Props) {
  const { players, roundHistory } = state;

  // starting balance = current balance minus all round changes
  const startingBalance = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of players) {
      const totalChange = roundHistory.reduce((s, r) => s + (r.balanceChanges[p.id] ?? 0), 0);
      map[p.id] = p.balance - totalChange;
    }
    return map;
  }, [players, roundHistory]);

  // line chart: balance per player per round (starts at round 0 = starting balance)
  const lineData = useMemo(() => {
    const points: Record<string, number | string>[] = [];
    const start: Record<string, number | string> = { round: 0 };
    for (const p of players) start[p.name] = startingBalance[p.id];
    points.push(start);

    const cumulative: Record<string, number> = {};
    for (const p of players) cumulative[p.id] = 0;

    for (let i = 0; i < roundHistory.length; i++) {
      const point: Record<string, number | string> = { round: i + 1 };
      for (const p of players) {
        cumulative[p.id] += roundHistory[i].balanceChanges[p.id] ?? 0;
        point[p.name] = startingBalance[p.id] + cumulative[p.id];
      }
      points.push(point);
    }
    return points;
  }, [players, roundHistory, startingBalance]);

  // bar chart: wins vs losses per player
  const barData = useMemo(() => {
    return players.map(p => ({
      name: p.name,
      Wins: roundHistory.filter(r => (r.balanceChanges[p.id] ?? 0) > 0).length,
      Losses: roundHistory.filter(r => (r.balanceChanges[p.id] ?? 0) < 0).length,
    }));
  }, [players, roundHistory]);

  // final standings sorted by net change
  const standings = useMemo(() => {
    return [...players]
      .map(p => ({ ...p, net: p.balance - startingBalance[p.id] }))
      .sort((a, b) => b.net - a.net);
  }, [players, startingBalance]);

  const chartTooltipStyle = {
    background: '#1e0a00',
    border: '1px solid rgba(200,150,40,0.3)',
    borderRadius: '4px',
    color: '#f5e6c8',
    fontSize: '0.8rem',
  };

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
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '1.1rem',
            color: 'var(--gold-light)',
            letterSpacing: '0.04em',
            flex: 1,
          }}
        >
          ♟ Game Summary
        </h1>
        <button onClick={onNewGame} className="btn btn-captain px-4 py-1.5 text-sm">
          New Game
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4" style={{ background: 'var(--wood-dark)' }}>

        {/* Final standings table */}
        <div className="card">
          <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
            Final Standings
          </h2>
          <div className="space-y-1">
            {standings.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold-dark)', fontSize: '0.85rem', minWidth: '1.4rem' }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1, color: 'var(--cream)', fontSize: '0.95rem' }}>{p.name}</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: p.net > 0 ? 'var(--color-positive)' : p.net < 0 ? 'var(--color-negative)' : 'var(--cream-dark)',
                  }}
                >
                  {p.net > 0 ? '+' : ''}{p.net}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--cream-dark)', opacity: 0.45 }}>
                  (bal: {p.balance > 0 ? '+' : ''}{p.balance})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Balance progression line chart */}
        {roundHistory.length > 0 && (
          <div className="card">
            <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
              Balance Progression
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="round"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }} />
                {players.map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Wins vs Losses bar chart */}
        {roundHistory.length > 0 && (
          <div className="card">
            <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
              Wins & Losses
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }} />
                <Bar dataKey="Wins" fill="#4fc84a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Losses" fill="#e05555" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Round history */}
        <RoundHistory history={roundHistory} />

      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add package.json package-lock.json src/components/GameSummaryScreen.tsx
git commit -m "feat: add GameSummaryScreen with Recharts line + bar charts"
```

---

### Task B2: Wire end game into App.tsx + GameScreen.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/GameScreen.tsx`

**Step 1: Edit `src/App.tsx`**

Read the file first. Make these changes:

a) Add import for `GameSummaryScreen` after `AdminScreen` import:
```typescript
import GameSummaryScreen from './components/GameSummaryScreen';
```

b) Change the `View` type to add `'summary'`:
```typescript
// Before (from Feature A):
type View = 'game' | 'dashboard' | 'admin';
// After:
type View = 'game' | 'dashboard' | 'admin' | 'summary';
```

c) Add summary view block after the admin view block:
```typescript
if (loggedIn && view === 'summary') {
  return (
    <GameSummaryScreen
      state={state}
      onNewGame={() => {
        handleDispatch({ type: 'RESET_GAME' });
        setView('game');
      }}
    />
  );
}
```

d) In the local/host `<GameScreen>` render (the last one before the closing `}`), add `onEndGame` prop:
```tsx
onEndGame={state.roundHistory.length > 0 ? () => setView('summary') : undefined}
```

The spectator GameScreen does NOT get `onEndGame`.

**Step 2: Edit `src/components/GameScreen.tsx`**

Read the file first. Make these changes:

a) Add `onEndGame?: () => void` to `GameScreenProps` interface (after `onOpenAdmin`):
```typescript
onEndGame?: () => void;
```

b) Destructure `onEndGame` in the function signature:
```typescript
export default function GameScreen({ state, dispatch, onUndo, canUndo, mode, roomCode, onCreateRoom, onOpenDashboard, onOpenAdmin, onEndGame }: GameScreenProps) {
```

c) Add the End Game button in the hamburger dropdown, just before the "✕ New Game" button:
```tsx
{onEndGame && !roundActive && (
  <button
    onClick={() => { onEndGame(); setMenuOpen(false); }}
    style={{ ...menuItemStyle, color: '#c8923a' }}
  >
    ⬛ End Game
  </button>
)}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Manual smoke test**

1. Start backend + frontend
2. Play a game to completion of at least 1 round
3. Open hamburger — see "⬛ End Game" button (only visible between rounds)
4. Click End Game — shows GameSummaryScreen
5. Verify: standings table, line chart, bar chart, round history all render
6. Click "New Game" — resets and returns to setup screen

**Step 5: Commit**

```bash
git add src/App.tsx src/components/GameScreen.tsx
git commit -m "feat: wire end game summary — End Game button + GameSummaryScreen routing"
```

---

## Feature C: Remove Player

> **Assumption:** Features A and B are already implemented and committed.

### Task C1: Reducer changes + RemovePlayerModal

**Files:**
- Modify: `src/types.ts`
- Modify: `src/gameReducer.ts`
- Create: `src/components/RemovePlayerModal.tsx`

**Step 1: Add `REMOVE_PLAYER` to types.ts**

Read `src/types.ts`. Add to the `GameAction` union, after the `ADD_PLAYER` line:
```typescript
| { type: 'REMOVE_PLAYER'; playerId: string; balanceAdjustments: Record<string, number> }
```

**Step 2: Write a manual test for the reducer case**

Create `backend/tests/` — wait, this is a frontend reducer. There's no test infra for it. Instead, the plan includes a "mental test" you can run manually. Skip to implementation.

**Step 3: Add `REMOVE_PLAYER` case to `src/gameReducer.ts`**

Read `src/gameReducer.ts`. Add this case inside the `switch` block, after the `ADD_PLAYER` case and before `RESET_GAME`:

```typescript
case 'REMOVE_PLAYER': {
  // Only allowed between rounds
  if (state.currentRound && !state.currentRound.isComplete) return state;

  const { playerId, balanceAdjustments } = action;
  const removedPlayer = state.players.find(p => p.id === playerId);
  if (!removedPlayer) return state;

  // Validate zero-sum: adjustments must exactly cancel removed player's balance
  const adjustmentSum = Object.values(balanceAdjustments).reduce((a, b) => a + b, 0);
  if (Math.abs(adjustmentSum + removedPlayer.balance) > 0.001) return state;

  const newPlayers = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      ...p,
      balance: p.balance + (balanceAdjustments[p.id] ?? 0),
    }));

  validateZeroSum(newPlayers);

  const newTeamBOrder = state.teamBOrder.filter(id => id !== playerId);
  // If removed player was captain, promote first remaining player
  const newCaptainId =
    state.captainId === playerId ? (newPlayers[0]?.id ?? '') : state.captainId;

  return {
    ...state,
    players: newPlayers,
    teamBOrder: newTeamBOrder,
    captainId: newCaptainId,
    lateJoiners: state.lateJoiners.filter(id => id !== playerId),
  };
}
```

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors (the new union member is handled by the switch)

**Step 5: Create `src/components/RemovePlayerModal.tsx`**

```tsx
import { useState } from 'react';
import type { Player } from '../types';

interface Props {
  players: Player[];
  onConfirm: (playerId: string, adjustments: Record<string, number>) => void;
  onCancel: () => void;
}

export default function RemovePlayerModal({ players, onConfirm, onCancel }: Props) {
  const [selectedId, setSelectedId] = useState<string>(players[0]?.id ?? '');
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const removedPlayer = players.find(p => p.id === selectedId);
  const remaining = players.filter(p => p.id !== selectedId);

  const getAdj = (id: string) => adjustments[id] ?? 0;
  const setAdj = (id: string, val: number) =>
    setAdjustments(prev => ({ ...prev, [id]: val }));

  const handleSelectPlayer = (id: string) => {
    setSelectedId(id);
    setAdjustments({});
  };

  const toDistribute = -(removedPlayer?.balance ?? 0);
  const distributed = remaining.reduce((s, p) => s + getAdj(p.id), 0);
  const leftover = toDistribute - distributed;
  const canConfirm = Math.abs(leftover) < 0.001 && removedPlayer !== undefined;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          border: '1px solid var(--gold-dark)',
          borderRadius: '6px',
          padding: '1.25rem',
          width: '100%',
          maxWidth: '380px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            color: 'var(--gold-light)',
            fontSize: '1rem',
            marginBottom: '1rem',
          }}
        >
          Remove Player
        </h2>

        {/* Player selector */}
        <label style={{ display: 'block', color: 'var(--cream-dark)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
          Player to remove
        </label>
        <select
          value={selectedId}
          onChange={e => handleSelectPlayer(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            color: 'var(--cream)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} (balance: {p.balance > 0 ? '+' : ''}{p.balance})
            </option>
          ))}
        </select>

        {removedPlayer && (
          <>
            {toDistribute !== 0 && (
              <p style={{ color: 'var(--cream-dark)', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                {removedPlayer.name}'s balance of <strong style={{ color: removedPlayer.balance > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                  {removedPlayer.balance > 0 ? '+' : ''}{removedPlayer.balance}
                </strong> must be distributed to remaining players (sum must reach 0).
              </p>
            )}

            {/* Per-player adjustments */}
            <div style={{ marginBottom: '1rem' }}>
              {remaining.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ flex: 1, color: 'var(--cream)', fontSize: '0.9rem' }}>
                    {p.name}
                    <span style={{ opacity: 0.4, fontSize: '0.78rem', marginLeft: '0.3rem' }}>
                      ({p.balance > 0 ? '+' : ''}{p.balance})
                    </span>
                  </span>
                  <button
                    onClick={() => setAdj(p.id, getAdj(p.id) - 1)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      background: 'rgba(224,85,85,0.2)',
                      border: '1px solid rgba(224,85,85,0.4)',
                      borderRadius: '3px',
                      color: 'var(--color-negative)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      minWidth: '2.8rem',
                      textAlign: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: getAdj(p.id) > 0 ? 'var(--color-positive)' : getAdj(p.id) < 0 ? 'var(--color-negative)' : 'var(--cream-dark)',
                    }}
                  >
                    {getAdj(p.id) > 0 ? '+' : ''}{getAdj(p.id)}
                  </span>
                  <button
                    onClick={() => setAdj(p.id, getAdj(p.id) + 1)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      background: 'rgba(79,200,74,0.2)',
                      border: '1px solid rgba(79,200,74,0.4)',
                      borderRadius: '3px',
                      color: 'var(--color-positive)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>

            {/* Running sum counter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              <span style={{ color: 'var(--cream-dark)', fontSize: '0.8rem' }}>
                Remaining to distribute:
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: Math.abs(leftover) < 0.001 ? 'var(--color-positive)' : 'var(--color-negative)',
                }}
              >
                {leftover > 0 ? '+' : ''}{leftover}
              </span>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onCancel} className="btn btn-ghost flex-1 py-2">
            Cancel
          </button>
          <button
            onClick={() => removedPlayer && onConfirm(selectedId, adjustments)}
            disabled={!canConfirm}
            className={`btn btn-captain flex-1 py-2 ${!canConfirm ? 'btn-disabled' : ''}`}
          >
            Confirm Remove
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 7: Commit**

```bash
git add src/types.ts src/gameReducer.ts src/components/RemovePlayerModal.tsx
git commit -m "feat: REMOVE_PLAYER reducer action + RemovePlayerModal component"
```

---

### Task C2: Wire Remove Player into GameScreen.tsx

**Files:**
- Modify: `src/components/GameScreen.tsx`

**Step 1: Edit `src/components/GameScreen.tsx`**

Read the file first. Make these changes:

a) Add import at the top (after existing imports):
```typescript
import RemovePlayerModal from './RemovePlayerModal';
```

b) Add `showRemoveModal` state (after the existing `showAddPlayer` state):
```typescript
const [showRemoveModal, setShowRemoveModal] = useState(false);
```

c) Add the Remove Player button in the hamburger dropdown (after the "Add Player" button):
```tsx
{!roundActive && state.players.length > 1 && (
  <button
    onClick={() => { setShowRemoveModal(true); setMenuOpen(false); }}
    style={menuItemStyle}
  >
    − Remove Player
  </button>
)}
```

d) Add the modal render at the very bottom of the component return, just before the closing `</div>`:
```tsx
{showRemoveModal && (
  <RemovePlayerModal
    players={state.players}
    onConfirm={(playerId, balanceAdjustments) => {
      dispatch({ type: 'REMOVE_PLAYER', playerId, balanceAdjustments });
      setShowRemoveModal(false);
    }}
    onCancel={() => setShowRemoveModal(false)}
  />
)}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Manual smoke test**

1. Start a game with 3+ players
2. Resolve at least 1 round (so players have non-zero balances)
3. Open hamburger — see "− Remove Player" button (only visible between rounds)
4. Click Remove Player — modal opens
5. Select a player to remove
6. Adjust remaining players' balances using +/− buttons
7. Verify "Remaining to distribute" counter updates correctly
8. Confirm button disabled until counter = 0
9. Click Confirm — player is removed, balances updated
10. Verify scoreboard shows correct updated balances, removed player gone

**Step 4: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat: wire Remove Player modal into GameScreen hamburger menu"
```

---

## Final Verification

After all 3 features are implemented:

```bash
# Run backend tests
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc/backend
pytest tests/ -v

# Check TypeScript
cd ..
npx tsc --noEmit

# Build for production (catches any remaining issues)
npm run build
```

All should pass with no errors.
