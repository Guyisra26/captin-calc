# Admin Dashboard, End Game Stats & Remove Player — Design Document

**Date:** 2026-03-28

---

## Feature 1: Admin Dashboard

### Access Control
- `ADMIN_USERNAME` env var in `.env` (both backend and frontend read it)
- Backend: new `get_admin_user` dependency — checks JWT user matches admin username
- Frontend: after login, if `display_name === ADMIN_USERNAME` → show "Admin" button in hamburger menu

### Route
- New view `'admin'` in App.tsx view state
- Renders `AdminScreen` component

### Sections

**Users Tab**
- List all users from `GET /api/admin/users`
- Create new user form: username + display name + password
- `POST /api/admin/users` — admin-only, hashes password, inserts to MongoDB

**Stats Tab**
- Same data as existing dashboard (`GET /api/dashboard`)
- Reuses `PlayerCard` components from `DashboardScreen`

### Backend Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users (admin only) |
| POST | `/api/admin/users` | Create new user (admin only) |

---

## Feature 2: Game Stats (per round + end game)

### Stats Update Timing
- After each `RESOLVE_ROUND` → immediately POST round data to backend
- Uses a new lightweight endpoint `POST /api/games/round` that upserts into the current game session
- Game session identified by a `sessionId` (UUID) generated at `START_GAME`, stored in App state

### End Game Flow
1. Host presses **"End Game"** in hamburger menu
2. App shows `GameSummaryScreen` — full stats for this game
3. Host presses "New Game" → resets (existing RESET_GAME flow)

### GameSummaryScreen
- **Balance table** — net change per player this game (final - starting balance)
- **Line chart** — cumulative balance per player across rounds (Recharts `LineChart`)
- **Bar chart** — wins vs losses per player (Recharts `BarChart`)
- **Round history** — collapsible list of rounds (reuses existing `RoundHistory`)
- "New Game" button at bottom

### Tech
- **Recharts** — `npm install recharts` — lightweight, React-native, no extra config
- Colors match existing theme (gold, positive green, negative red)

### Backend
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/games/session` | Create game session, returns `sessionId` |
| POST | `/api/games/session/{id}/round` | Append round to session |
| GET | `/api/games/session/{id}` | Get full session data |

---

## Feature 3: Remove Player

### When
- Only between rounds (`currentRound === null` or `currentRound.isComplete === true`)
- "Remove Player" option added next to "Add Player" in the hamburger menu

### Flow
1. Host opens hamburger → "Remove Player"
2. Dropdown to select which player to remove
3. **Balance Redistribution Modal** opens:
   - Shows removed player's balance (e.g. `Player B: -2`)
   - Lists remaining players with current balances
   - Each remaining player has **+1 / -1 buttons** (or number input) to adjust their balance
   - Running **Sum counter** shows how much is left to distribute (must reach 0)
   - "Confirm Remove" button disabled until sum = 0
4. On confirm → dispatch `REMOVE_PLAYER` action to game reducer

### Reducer (`REMOVE_PLAYER` action)
```typescript
{ type: 'REMOVE_PLAYER'; playerId: string; balanceAdjustments: Record<string, number> }
```
- Validates zero-sum before applying
- Removes player from `players`, `teamBOrder`, `captainId` fallback if needed
- Updates remaining player balances

### Zero-Sum Invariant
- Modal enforces: `sum(adjustments) === -removedPlayer.balance`
- Confirm disabled until satisfied
