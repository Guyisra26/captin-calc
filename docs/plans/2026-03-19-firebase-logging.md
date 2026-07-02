# Firebase Activity Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Log every game (local and hosted) permanently to `/logs/{gameId}` in Firebase Realtime Database, so activity is visible even after rooms are deleted.

**Architecture:** A new `firebaseLog.ts` file exposes 4 fire-and-forget REST functions. Three new `useEffect` hooks in `App.tsx` call these functions when game state changes — game start, round complete, room created, and game reset. A `gameIdRef` (React ref) tracks the current game's log key. No game logic files are touched.

**Tech Stack:** Vite + React 18 + TypeScript, Firebase Realtime Database REST API (same pattern as existing `firebaseSync.ts`)

---

### Task 1: Create `src/firebaseLog.ts`

**Files:**
- Create: `src/firebaseLog.ts`

**Context:** Firebase Realtime Database REST API uses:
- `PUT` to write/overwrite a node
- `PATCH` to update only specified fields
- URL pattern: `${DB_URL}/logs/${gameId}.json`
- `DB_URL` is `import.meta.env.VITE_FIREBASE_DATABASE_URL`

Look at `src/firebaseSync.ts` for the exact fetch pattern to follow.

**Step 1: Create the file with all 4 logging functions**

```ts
// src/firebaseLog.ts
import type { Player, RoundSummary } from './types';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string;

function patch(path: string, data: object): void {
  fetch(`${DB_URL}${path}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(err => console.error('Firebase log error:', err));
}

function put(path: string, data: object): void {
  fetch(`${DB_URL}${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(err => console.error('Firebase log error:', err));
}

export function logGameStart(
  gameId: string,
  players: Player[],
  roomCode: string | null
): void {
  put(`/logs/${gameId}`, {
    gameId,
    roomCode: roomCode ?? null,
    createdAt: Date.now(),
    status: 'active',
    endedAt: null,
    players: players.map(p => ({ id: p.id, name: p.name })),
  });
}

export function logRoomCode(gameId: string, roomCode: string): void {
  patch(`/logs/${gameId}`, { roomCode });
}

export function logRoundComplete(gameId: string, round: RoundSummary): void {
  put(`/logs/${gameId}/rounds/${round.roundNumber}`, {
    roundNumber: round.roundNumber,
    captainName: round.captainName,
    representativeName: round.representativeName,
    winner: round.winner,
    winType: round.winType,
    doublings: round.doublings,
    removals: round.removals,
    finalPerPlayerStake: round.finalPerPlayerStake,
    balanceChanges: round.balanceChanges,
    completedAt: Date.now(),
  });
}

export function logGameEnded(gameId: string): void {
  patch(`/logs/${gameId}`, {
    status: 'ended',
    endedAt: Date.now(),
  });
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/guyisraeli/Dev/Projects/Projects_for_friends/captin_calc
npm run build
```

Expected: no errors. If there are type errors, fix them before continuing.

**Step 3: Commit**

```bash
git add src/firebaseLog.ts
git commit -m "feat: add firebaseLog.ts with logGameStart, logRoomCode, logRoundComplete, logGameEnded"
```

---

### Task 2: Wire logging into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Context:** `App.tsx` already imports from `firebaseSync.ts` and uses `useRef`, `useEffect`, `useCallback`. The game state is managed by `undoReducer`. The relevant pieces:
- `state` = current `GameState` (from `undoReducer`)
- `state.screen` changes from `'setup'` to `'game'` when `START_GAME` fires
- `state.players` has the player list after `START_GAME`
- `state.roundHistory` grows by 1 each time `RESOLVE_ROUND` fires
- `roomCode` state holds the Firebase room code (null in local mode)
- `mode` state is `'local' | 'host' | 'spectator'`
- `handleDispatch` intercepts `RESET_GAME`

**Step 1: Add import and gameIdRef**

Add to the imports at the top of `App.tsx`:
```ts
import { logGameStart, logRoomCode, logRoundComplete, logGameEnded } from './firebaseLog';
```

Inside the `App()` function, after the existing refs, add:
```ts
const gameIdRef = useRef<string | null>(null);
```

**Step 2: Add effect — log game start**

This runs when the screen transitions to `'game'` (i.e. `START_GAME` was dispatched). Add after the existing `useEffect` blocks:

```ts
// Log game start to Firebase
const prevScreenRef = useRef(state.screen);
useEffect(() => {
  if (prevScreenRef.current === 'setup' && state.screen === 'game') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    gameIdRef.current = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => chars[b % chars.length])
      .join('');
    logGameStart(gameIdRef.current, state.players, roomCode);
  }
  prevScreenRef.current = state.screen;
}, [state.screen, state.players, roomCode]);
```

**Step 3: Add effect — log round completion**

This runs whenever a new round is appended to `roundHistory`:

```ts
// Log each completed round
const prevRoundCountRef = useRef(0);
useEffect(() => {
  const count = state.roundHistory.length;
  if (count > prevRoundCountRef.current && gameIdRef.current) {
    const latest = state.roundHistory[count - 1];
    logRoundComplete(gameIdRef.current, latest);
  }
  prevRoundCountRef.current = count;
}, [state.roundHistory]);
```

**Step 4: Add effect — log room code when host room is created**

This runs when `roomCode` changes from null to a value while a game is active:

```ts
// Log room code when host room is created mid-game
useEffect(() => {
  if (roomCode && gameIdRef.current && state.screen === 'game') {
    logRoomCode(gameIdRef.current, roomCode);
  }
}, [roomCode, state.screen]);
```

**Step 5: Log game ended in handleDispatch**

Find the existing `handleDispatch` function:
```ts
const handleDispatch = useCallback((action: GameAction) => {
  if (action.type === 'RESET_GAME' && mode === 'host' && roomCode) {
    deleteRoom(roomCode);
    setMode('local');
    setRoomCode(null);
  }
  dispatch(action);
}, [mode, roomCode, dispatch]);
```

Add the `logGameEnded` call before `dispatch(action)`:
```ts
const handleDispatch = useCallback((action: GameAction) => {
  if (action.type === 'RESET_GAME' && mode === 'host' && roomCode) {
    deleteRoom(roomCode);
    setMode('local');
    setRoomCode(null);
  }
  if (action.type === 'RESET_GAME' && gameIdRef.current) {
    logGameEnded(gameIdRef.current);
    gameIdRef.current = null;
  }
  dispatch(action);
}, [mode, roomCode, dispatch]);
```

**Step 6: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Firebase activity logging into App.tsx"
```

---

### Task 3: Verify in Firebase console

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Play a game**

1. Open the app, add 3 players, start a game
2. Play one round to completion
3. Check Firebase Realtime Database console → `/logs` — you should see a new entry with players listed
4. Check `/logs/{gameId}/rounds/1` — should have round summary
5. Reset the game
6. Check `/logs/{gameId}/status` — should be `'ended'`

**Step 3: Test local → host promotion**

1. Start a new local game
2. Check `/logs` — new entry appears
3. Create a room (host mode)
4. Check `/logs/{gameId}/roomCode` — should now have the room code

**Step 4: Verify old logs survive room deletion**

1. Reset the game (deletes `/rooms/{roomCode}`)
2. Confirm `/logs/{gameId}` still exists with `status: 'ended'`

---

### Task 4: Update Firebase rules (if needed)

**Files:**
- Modify: `firebase.json` or Firebase console rules

**Context:** The existing rules allow read/write to `/rooms`. The new `/logs` path also needs write access. Check if rules are restrictive.

**Step 1: Check current rules**

Open Firebase console → Realtime Database → Rules tab. If rules look like:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
No change needed. If rules restrict to `/rooms` only, add:
```json
{
  "rules": {
    "rooms": { ".read": true, ".write": true },
    "logs": { ".write": true, ".read": false }
  }
}
```
(Read is false — logs are for you to view in the console only, not exposed to users.)

**Step 2: Commit if rules file was changed locally**

```bash
git add firebase.json
git commit -m "chore: allow Firebase write access to /logs path"
```
