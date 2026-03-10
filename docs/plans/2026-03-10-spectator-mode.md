# Spectator Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time read-only spectator mode — host manages game as before, spectators join via 6-char room code and see live state.

**Architecture:** Firebase Realtime Database holds game state at `/rooms/{roomCode}/state`. Host writes on every state change; spectators subscribe with `onValue`. App has three modes: `local` (today's behavior), `host` (writes to Firebase), `spectator` (reads from Firebase, UI read-only).

**Tech Stack:** Firebase Realtime Database (firebase v12 already installed), React 18, TypeScript, Vite

---

## Prerequisites (do before Task 1)

1. In Firebase Console → go to your project → **Realtime Database** → Create database (choose "Start in test mode" or set rules manually as shown in Task 8).
2. Copy the database URL (looks like `https://<project-id>-default-rtdb.firebaseio.com`).
3. Add to your `.env.local`:
   ```
   VITE_FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
   ```

---

### Task 1: Update `firebase.ts` to export the Realtime Database

**Files:**
- Modify: `src/firebase.ts`

**Step 1: Add database export**

Replace the entire file content with:

```ts
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

export let analytics: ReturnType<typeof getAnalytics> | null = null;

(async () => {
  const ok = await isSupported();
  if (ok) analytics = getAnalytics(app);
})();

export const db = getDatabase(app);
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors. If `databaseURL` is missing from `.env.local`, you'll get a runtime warning but it won't break the build.

**Step 3: Commit**

```bash
git add src/firebase.ts
git commit -m "feat: export Realtime Database instance from firebase.ts"
```

---

### Task 2: Create `src/firebaseSync.ts`

**Files:**
- Create: `src/firebaseSync.ts`

**Step 1: Write the file**

```ts
import { ref, set, onValue, remove } from 'firebase/database';
import { db } from './firebase';
import type { GameState } from './types';

export function writeRoom(roomCode: string, state: GameState): void {
  set(ref(db, `rooms/${roomCode}/state`), state);
}

export function subscribeRoom(
  roomCode: string,
  callback: (state: GameState | null) => void
): () => void {
  const r = ref(db, `rooms/${roomCode}/state`);
  return onValue(r, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as GameState) : null);
  });
}

export function deleteRoom(roomCode: string): void {
  remove(ref(db, `rooms/${roomCode}`));
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/firebaseSync.ts
git commit -m "feat: add firebaseSync helpers (writeRoom, subscribeRoom, deleteRoom)"
```

---

### Task 3: Add `AppMode` type to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

**Step 1: Append at end of file**

Add after the last line:

```ts
export type AppMode = 'local' | 'host' | 'spectator';
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add AppMode type"
```

---

### Task 4: Create `src/components/SpectatorScreen.tsx`

This component handles two spectator states: waiting for the host to start, and game ended (host reset).

**Files:**
- Create: `src/components/SpectatorScreen.tsx`

**Step 1: Write the component**

```tsx
interface SpectatorScreenProps {
  roomCode: string;
  status: 'waiting' | 'ended';
}

export default function SpectatorScreen({ roomCode, status }: SpectatorScreenProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">{status === 'waiting' ? '⏳' : '🏁'}</div>
        <h2 className="text-2xl font-bold text-slate-200">
          {status === 'waiting' ? 'Waiting for host...' : 'Game ended'}
        </h2>
        <p className="text-slate-400">
          {status === 'waiting'
            ? 'The host has not started the game yet.'
            : 'The host has reset the game.'}
        </p>
        <p className="text-sm text-slate-600">Room: {roomCode}</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/SpectatorScreen.tsx
git commit -m "feat: add SpectatorScreen for waiting/ended states"
```

---

### Task 5: Update `GameScreen.tsx` — room banner + read-only prop

**Files:**
- Modify: `src/components/GameScreen.tsx`

**Step 1: Update props interface**

At the top of the file, change the `GameScreenProps` interface:

```tsx
interface GameScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onUndo: () => void;
  canUndo: boolean;
  mode: 'local' | 'host' | 'spectator';
  roomCode: string | null;
  onCreateRoom: () => void;
}
```

**Step 2: Update function signature**

```tsx
export default function GameScreen({ state, dispatch, onUndo, canUndo, mode, roomCode, onCreateRoom }: GameScreenProps) {
```

**Step 3: Add copy-link handler after `handleAddPlayer`**

```tsx
const handleCopyLink = () => {
  if (!roomCode) return;
  const url = `${window.location.origin}/?room=${roomCode}`;
  navigator.clipboard.writeText(url);
};
```

**Step 4: Replace the top bar `<div>` content**

Find the top bar div (starts with `{/* Top Bar */}`) and replace its inner content with:

```tsx
{/* Top Bar */}
<div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 shrink-0">
  <div className="flex items-center gap-3">
    <h1 className="text-lg font-bold text-amber-400">Captain Calculator</h1>
    {/* Spectator LIVE badge */}
    {mode === 'spectator' && roomCode && (
      <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        LIVE · {roomCode}
      </span>
    )}
    {/* Host room code badge */}
    {mode === 'host' && roomCode && (
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded-full font-medium hover:bg-emerald-500/30 transition-colors"
        title="Copy spectator link"
      >
        Room: {roomCode} · Copy Link
      </button>
    )}
  </div>
  <div className="flex items-center gap-2">
    <span className="text-sm text-slate-500 hidden sm:inline">
      {state.players.length} players
    </span>
    {mode !== 'spectator' && (
      <>
        <button
          onClick={() => setShowAddPlayer(v => !v)}
          className="btn btn-ghost px-3 py-1.5 text-sm"
        >
          + Player
        </button>
        <button
          onClick={onUndo}
          className={`btn btn-ghost px-3 py-1.5 text-sm ${!canUndo ? 'btn-disabled' : ''}`}
        >
          Undo
        </button>
        <button onClick={handleReset} className="btn btn-ghost px-3 py-1.5 text-sm">
          New Game
        </button>
      </>
    )}
    {mode === 'local' && (
      <button
        onClick={onCreateRoom}
        className="btn btn-ghost px-3 py-1.5 text-sm text-emerald-400"
      >
        Share
      </button>
    )}
  </div>
</div>
```

**Step 5: Pass `isReadOnly` to `RoundPanel`**

Find the `<RoundPanel>` usage and update it:

```tsx
<RoundPanel state={state} dispatch={dispatch} isReadOnly={mode === 'spectator'} />
```

**Step 6: Hide "Add Player" panel in spectator mode**

In the Add Player inline section, wrap it:
```tsx
{showAddPlayer && mode !== 'spectator' && (
  // ... existing add player div
)}
```

**Step 7: Compile check**

Run: `npm run build`
Expected: TypeScript errors on `RoundPanel` (not yet updated) and `App.tsx` (props mismatch). That's expected — we'll fix in next tasks.

**Step 8: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat: GameScreen — room banner, share button, read-only spectator controls"
```

---

### Task 6: Update `RoundPanel.tsx` — add `isReadOnly` prop

**Files:**
- Modify: `src/components/RoundPanel.tsx`

**Step 1: Update props interface**

Change `RoundPanelProps`:

```tsx
interface RoundPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isReadOnly?: boolean;
}
```

**Step 2: Destructure the new prop**

```tsx
export default function RoundPanel({ state, dispatch, isReadOnly = false }: RoundPanelProps) {
```

**Step 3: Hide "Start Round" button when read-only (in the no-active-round return)**

Find the "Start Round" button and wrap it:

```tsx
{!isReadOnly && (
  <button
    onClick={() => { ... }}
    className="btn btn-captain text-lg w-full"
  >
    Start Round {nextRoundNum}
  </button>
)}
```

**Step 4: Hide action section when read-only**

Find the last section `{/* Action Buttons */}` — the entire `<div className="border-t border-slate-700 pt-4 space-y-2">` block — and wrap it:

```tsx
{!isReadOnly && (
  <div className="border-t border-slate-700 pt-4 space-y-2">
    {/* ... all existing action buttons content unchanged ... */}
  </div>
)}
```

**Step 5: Hide removal/pivot prompts when read-only**

Wrap the removal prompt section:
```tsx
{removalPossible && !showRemovalPicker && !isReadOnly && (
  // ... existing removal prompt
)}
{round.canRemove && activeCount <= 1 && !isReadOnly && (
  // ... existing auto-skip message
)}
{showRemovalPicker && removalPossible && !isReadOnly && (
  // ... existing removal picker
)}
```

**Step 6: Compile check**

Run: `npm run build`
Expected: Only App.tsx errors remaining (GameScreen props mismatch).

**Step 7: Commit**

```bash
git add src/components/RoundPanel.tsx
git commit -m "feat: RoundPanel — isReadOnly prop hides all action controls"
```

---

### Task 7: Update `App.tsx` — mode logic, URL parsing, Firebase sync

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add imports**

At the top, add:

```tsx
import { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameAction, AppMode } from './types';
import { writeRoom, subscribeRoom, deleteRoom } from './firebaseSync';
import SpectatorScreen from './components/SpectatorScreen';
```

(Replace existing import lines — keep `gameReducer`, `initialGameState`, `saveGameState`, `loadGameState`, `SetupScreen`, `GameScreen` imports.)

**Step 2: Add URL-based initial mode detection**

Before the `App` function, add a helper:

```tsx
function getRoomCodeFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}
```

**Step 3: Add mode and roomCode state inside `App`**

After the `useReducer` call, add:

```tsx
const urlRoom = getRoomCodeFromURL();
const [mode, setMode] = useState<AppMode>(urlRoom ? 'spectator' : 'local');
const [roomCode, setRoomCode] = useState<string | null>(urlRoom);
const [spectatorState, setSpectatorState] = useState<GameState | null>(null);
```

**Step 4: Add Firebase write effect (host mode)**

```tsx
useEffect(() => {
  if (mode !== 'host' || !roomCode) return;
  writeRoom(roomCode, state);
}, [mode, roomCode, state]);
```

**Step 5: Add Firebase subscribe effect (spectator mode)**

```tsx
useEffect(() => {
  if (mode !== 'spectator' || !roomCode) return;
  const unsub = subscribeRoom(roomCode, (s) => setSpectatorState(s));
  return () => unsub();
}, [mode, roomCode]);
```

**Step 6: Add `handleCreateRoom`**

```tsx
const handleCreateRoom = useCallback(() => {
  const code = crypto.randomUUID().slice(0, 6).toUpperCase();
  setRoomCode(code);
  setMode('host');
}, []);
```

**Step 7: Wrap dispatch to handle RESET_GAME cleanup**

Replace the existing `handleStartGame` and add a wrapped dispatch:

```tsx
const handleDispatch = useCallback((action: GameAction) => {
  if (action.type === 'RESET_GAME' && mode === 'host' && roomCode) {
    deleteRoom(roomCode);
    setMode('local');
    setRoomCode(null);
  }
  dispatch(action);
}, [mode, roomCode, dispatch]);
```

**Step 8: Update the render logic**

Replace the existing `if (state.screen === 'setup')` block and the final return:

```tsx
// Spectator mode: show remote state
if (mode === 'spectator') {
  if (!spectatorState || spectatorState.screen === 'setup') {
    return (
      <SpectatorScreen
        roomCode={roomCode!}
        status={spectatorState === null ? 'waiting' : 'ended'}
      />
    );
  }
  return (
    <GameScreen
      state={spectatorState}
      dispatch={handleDispatch}
      onUndo={() => {}}
      canUndo={false}
      mode="spectator"
      roomCode={roomCode}
      onCreateRoom={() => {}}
    />
  );
}

// Local / Host modes
if (state.screen === 'setup') {
  return <SetupScreen onStartGame={handleStartGame} />;
}

return (
  <GameScreen
    state={state}
    dispatch={handleDispatch}
    onUndo={handleUndo}
    canUndo={canUndo}
    mode={mode}
    roomCode={roomCode}
    onCreateRoom={handleCreateRoom}
  />
);
```

**Step 9: Full compile check**

Run: `npm run build`
Expected: Clean build, zero TypeScript errors.

**Step 10: Commit**

```bash
git add src/App.tsx
git commit -m "feat: App.tsx — mode state, URL room detection, Firebase sync, room management"
```

---

### Task 8: Set Firebase Realtime Database Security Rules

**Steps (done in Firebase Console, not code):**

1. Go to Firebase Console → your project → Realtime Database → Rules tab.
2. Replace the existing rules with:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomCode": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
3. Click "Publish".

This allows anyone with a room code to read the state. Writing is open — acceptable for a private/social app with no auth.

---

### Task 9: Manual End-to-End Test

**Setup:**
- Run dev server: `npm run dev`
- Open two browser windows side by side

**Test A — Local mode (no regression):**
1. Open `http://localhost:5173/`
2. Set up a game, play a few actions
3. Confirm everything works as before — undo, scoring, round resolution
4. Confirm no "Share" button crashes or behaves oddly

**Test B — Host creates room:**
1. In window 1, start a game
2. Click "Share" button in the header
3. Confirm a room code appears (e.g. `A1B2C3`) and the header shows it
4. Click the room code badge — confirm a link is copied to clipboard
5. Confirm game still functions normally (dispatch actions still work)

**Test C — Spectator joins:**
1. Open the copied link in window 2 (e.g. `http://localhost:5173/?room=A1B2C3`)
2. Confirm window 2 shows the same game state as window 1
3. In window 1, make game actions (double, resolve round, etc.)
4. Confirm window 2 updates in real time (< 1 second lag)
5. Confirm window 2 has no action buttons (no "Team B Doubles", no "Start Round", etc.)
6. Confirm window 2 shows the LIVE badge with room code

**Test D — Spectator joins before host starts:**
1. Open `http://localhost:5173/?room=ZZZZZZ` (non-existent room)
2. Confirm "Waiting for host..." screen appears

**Test E — Host resets game:**
1. In window 1 (host), click "New Game" and confirm
2. Confirm window 1 goes back to SetupScreen and room code clears from header
3. Confirm window 2 (spectator) shows "Game ended" screen

---

### Task 10: Build and deploy

**Step 1: Production build**

```bash
npm run build
```

Expected: Clean build in `dist/`.

**Step 2: Deploy to Firebase Hosting**

```bash
npx firebase deploy --only hosting
```

**Step 3: Smoke test on production URL**

Repeat Test B and Test C on the live URL.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: spectator mode — real-time read-only view via room code"
```
