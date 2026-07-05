# Host Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the current host hand editing control of a live game to another allowlisted player via a one-time transfer link; the old host auto-drops to spectator.

**Architecture:** State + a transfer token live in the Firebase room (`rooms/<CODE>/{state,host,handoff}`). Coordination is by a monotonically-rising `epoch` and a uid comparison — advisory, not rule-enforced. A new `src/hostTransfer.ts` module holds all room-field logic; `ClaimHostScreen` is the recipient UI; `App.tsx` wires the offer, claim, and auto-step-down; `database.rules.json` is narrowed so only `state` is public-read.

**Tech Stack:** React 19, TypeScript (strict — unused vars fail `tsc`), Vite, Tailwind v4, Firebase RTDB via REST (`authedFetch`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-host-transfer-design.md`

## Global Constraints
- Do NOT modify `src/gameReducer.ts` or the game-action types in `src/types.ts`. (The undo wrapper in `App.tsx` may gain a `HYDRATE` case — that is App-level, not game logic.)
- Do NOT rename existing identifiers, props, CSS classes, or action literals.
- Dark-premium tokens only: `--bg`, `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-strong`, `--text`, `--text-dim`, `--text-faint`, `--color-positive`. Shared classes: `.card`, `.btn`, `.btn-captain`, `.btn-ghost`, `.btn-disabled`, `.menu-item`, `.brand`, `.brand-accent`.
- Room codes/tokens use the char set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` via `crypto.getRandomValues`.
- Existing 8 vitest tests must keep passing; `npm run build` must stay green (no unused imports).
- Only pure logic gets unit tests (project convention). React/effect/fetch code is verified by build + manual two-device testing (done by the user — the preview cannot complete Google sign-in).
- Stay on branch `main`. Do not push or deploy (the controller handles rules deploy after Task 6).

---

### Task 1: `hostTransfer.ts` module + pure-logic tests

**Files:**
- Modify: `src/firebaseSync.ts` (export `authedFetch`)
- Create: `src/hostTransfer.ts`
- Test: `src/hostTransfer.test.ts`

**Interfaces:**
- Consumes: `authedFetch(url, opts?)` from `./firebaseSync`; `GameState` from `./types`.
- Produces:
  - `interface HostInfo { uid: string; epoch: number }`
  - `interface Handoff { token: string; createdAt: number }`
  - `generateHandoffToken(): string` (12 chars)
  - `evaluateClaim(handoff: Handoff | null, token: string): { ok: true } | { ok: false; reason: 'expired' | 'mismatch' }`
  - `nextHostInfo(current: HostInfo | null, myUid: string): HostInfo`
  - `isStillHost(hostInfo: HostInfo | null, myUid: string): boolean`
  - `readHost(code): Promise<HostInfo | null>`, `readHandoff(code): Promise<Handoff | null>`, `writeHost(code, info): Promise<void>`, `createHandoff(code): Promise<string>`, `cancelHandoff(code): Promise<void>`
  - `claimHost(code, token, myUid): Promise<{ ok: true; state: GameState | null } | { ok: false; reason: 'expired' | 'mismatch' }>`
  - `subscribeHost(code, cb: (info: HostInfo | null) => void): () => void`

- [ ] **Step 1: Export `authedFetch` from `src/firebaseSync.ts`**

Change line 7 from `async function authedFetch(` to `export async function authedFetch(`. No other change.

- [ ] **Step 2: Write the failing test — `src/hostTransfer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  generateHandoffToken, evaluateClaim, nextHostInfo, isStillHost,
} from './hostTransfer';

describe('generateHandoffToken', () => {
  it('is 12 chars from the allowed alphabet', () => {
    const t = generateHandoffToken();
    expect(t).toHaveLength(12);
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(t)).toBe(true);
  });
});

describe('evaluateClaim', () => {
  it('null handoff → expired', () => {
    expect(evaluateClaim(null, 'ABC')).toEqual({ ok: false, reason: 'expired' });
  });
  it('token mismatch → mismatch', () => {
    expect(evaluateClaim({ token: 'XYZ', createdAt: 1 }, 'ABC')).toEqual({ ok: false, reason: 'mismatch' });
  });
  it('matching token → ok', () => {
    expect(evaluateClaim({ token: 'ABC', createdAt: 1 }, 'ABC')).toEqual({ ok: true });
  });
});

describe('nextHostInfo', () => {
  it('no current host → epoch 1', () => {
    expect(nextHostInfo(null, 'u1')).toEqual({ uid: 'u1', epoch: 1 });
  });
  it('increments the existing epoch and takes my uid', () => {
    expect(nextHostInfo({ uid: 'old', epoch: 3 }, 'u2')).toEqual({ uid: 'u2', epoch: 4 });
  });
});

describe('isStillHost', () => {
  it('no host record → still host (adopted/legacy room)', () => {
    expect(isStillHost(null, 'u1')).toBe(true);
  });
  it('same uid → still host', () => {
    expect(isStillHost({ uid: 'u1', epoch: 2 }, 'u1')).toBe(true);
  });
  it('different uid → stepped down', () => {
    expect(isStillHost({ uid: 'u2', epoch: 3 }, 'u1')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/hostTransfer.test.ts`
Expected: FAIL — cannot resolve `./hostTransfer` / functions not defined.

- [ ] **Step 4: Create `src/hostTransfer.ts`**

```ts
import type { GameState } from './types';
import { authedFetch } from './firebaseSync';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string;
const HOST_POLL_INTERVAL_MS = 3000;
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface HostInfo { uid: string; epoch: number; }
export interface Handoff { token: string; createdAt: number; }

export function generateHandoffToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join('');
}

export function evaluateClaim(
  handoff: Handoff | null,
  token: string,
): { ok: true } | { ok: false; reason: 'expired' | 'mismatch' } {
  if (!handoff) return { ok: false, reason: 'expired' };
  if (handoff.token !== token) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

export function nextHostInfo(current: HostInfo | null, myUid: string): HostInfo {
  return { uid: myUid, epoch: (current?.epoch ?? 0) + 1 };
}

export function isStillHost(hostInfo: HostInfo | null, myUid: string): boolean {
  if (!hostInfo) return true;
  return hostInfo.uid === myUid;
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!DB_URL) return null;
  const res = await authedFetch(`${DB_URL}${path}.json`);
  if (!res.ok) return null;
  const raw = await res.json();
  return (raw ?? null) as T | null;
}

export function readHost(code: string): Promise<HostInfo | null> {
  return readJson<HostInfo>(`/rooms/${code}/host`);
}

export function readHandoff(code: string): Promise<Handoff | null> {
  return readJson<Handoff>(`/rooms/${code}/handoff`);
}

export async function writeHost(code: string, info: HostInfo): Promise<void> {
  if (!DB_URL) return;
  await authedFetch(`${DB_URL}/rooms/${code}/host.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
}

export async function createHandoff(code: string): Promise<string> {
  const token = generateHandoffToken();
  if (!DB_URL) return token;
  const handoff: Handoff = { token, createdAt: Date.now() };
  await authedFetch(`${DB_URL}/rooms/${code}/handoff.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(handoff),
  });
  return token;
}

export async function cancelHandoff(code: string): Promise<void> {
  if (!DB_URL) return;
  await authedFetch(`${DB_URL}/rooms/${code}/handoff.json`, { method: 'DELETE' });
}

async function readState(code: string): Promise<GameState | null> {
  if (!DB_URL) return null;
  const res = await authedFetch(`${DB_URL}/rooms/${code}/state.json`);
  if (!res.ok) return null;
  const raw = await res.json();
  return raw ? (JSON.parse(raw as string) as GameState) : null;
}

export async function claimHost(
  code: string,
  token: string,
  myUid: string,
): Promise<{ ok: true; state: GameState | null } | { ok: false; reason: 'expired' | 'mismatch' }> {
  const handoff = await readHandoff(code);
  const verdict = evaluateClaim(handoff, token);
  if (!verdict.ok) return verdict;
  const currentHost = await readHost(code);
  await writeHost(code, nextHostInfo(currentHost, myUid));
  await cancelHandoff(code);
  const state = await readState(code);
  return { ok: true, state };
}

export function subscribeHost(code: string, cb: (info: HostInfo | null) => void): () => void {
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      cb(await readHost(code));
    } catch (e) {
      console.error('Host poll error:', e);
    }
    if (!stopped) setTimeout(poll, HOST_POLL_INTERVAL_MS);
  };
  poll();
  return () => { stopped = true; };
}
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run` → Expected: all pass (8 existing + 10 new). Then `npm run build` → Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/firebaseSync.ts src/hostTransfer.ts src/hostTransfer.test.ts
git commit -m "feat: hostTransfer module (room host/handoff logic) + tests"
```

---

### Task 2: `ClaimHostScreen` component

**Files:**
- Create: `src/components/ClaimHostScreen.tsx`

**Interfaces:**
- Produces (default export):
  ```ts
  interface ClaimHostScreenProps {
    roomCode: string;
    status: 'confirm' | 'claiming' | 'expired';
    onConfirm: () => void;
    onWatchInstead: () => void;
  }
  ```

*(No unit test — presentational. Verified by build + Task 5 manual flow.)*

- [ ] **Step 1: Create `src/components/ClaimHostScreen.tsx`**

```tsx
interface ClaimHostScreenProps {
  roomCode: string;
  status: 'confirm' | 'claiming' | 'expired';
  onConfirm: () => void;
  onWatchInstead: () => void;
}

export default function ClaimHostScreen({ roomCode, status, onConfirm, onWatchInstead }: ClaimHostScreenProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <h1 className="brand" style={{ fontSize: '1.5rem', marginBottom: '0.9rem' }}>
          Captain <span className="brand-accent">Tavla</span>
        </h1>

        {status === 'expired' ? (
          <>
            <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: '0.4rem' }}>
              This transfer link is no longer valid
            </p>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              The offer expired or was already used.
            </p>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onWatchInstead}>
              Watch as spectator
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Take over hosting of</p>
            <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: '1.15rem', marginBottom: '1.25rem' }}>
              room {roomCode}
            </p>
            <button
              className={`btn btn-captain ${status === 'claiming' ? 'btn-disabled' : ''}`}
              style={{ width: '100%', marginBottom: '0.6rem' }}
              onClick={onConfirm}
            >
              {status === 'claiming' ? 'Taking over…' : 'Take over hosting'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onWatchInstead}>
              Just watch instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build` → Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/ClaimHostScreen.tsx
git commit -m "feat: ClaimHostScreen (recipient confirm / expired UI)"
```

---

### Task 3: GameScreen — Transfer/Cancel menu items

**Files:**
- Modify: `src/components/GameScreen.tsx`

**Interfaces:**
- Consumes (new optional props on `GameScreenProps`): `onTransferHost?: () => void`, `onCancelTransfer?: () => void`, `transferPending?: boolean`.

- [ ] **Step 1: Add the three props**

In `interface GameScreenProps`, after `onSignOut?: () => void;` add:
```tsx
  onTransferHost?: () => void;
  onCancelTransfer?: () => void;
  transferPending?: boolean;
```
And in the destructure list (after `onSignOut,`) add: `onTransferHost, onCancelTransfer, transferPending,`.

- [ ] **Step 2: Render the menu items**

In the `.menu-pop` dropdown, immediately AFTER the `{mode === 'host' && (` "☐ Stop Sharing" button block, insert:
```tsx
                {onTransferHost && (
                  <button
                    onClick={() => { onTransferHost(); setMenuOpen(false); }}
                    className="menu-item"
                    style={{ color: 'var(--color-positive)' }}
                  >
                    ⇄ Transfer Host
                  </button>
                )}

                {transferPending && onCancelTransfer && (
                  <button
                    onClick={() => { onCancelTransfer(); setMenuOpen(false); }}
                    className="menu-item"
                    style={{ color: 'var(--accent)' }}
                  >
                    ✕ Cancel Transfer
                  </button>
                )}
```

- [ ] **Step 3: Build**

Run: `npm run build` → Expected: passes (props optional, no other call site breaks).

- [ ] **Step 4: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat: Transfer Host / Cancel Transfer menu items in GameScreen"
```

---

### Task 4: App — host identity, adopt, and the transfer offer

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `createHandoff`, `cancelHandoff`, `readHost`, `writeHost` from `./hostTransfer`; existing `authUser` (its `.uid`).
- Produces (into GameScreen): `onTransferHost`, `onCancelTransfer`, `transferPending`.

- [ ] **Step 1: Add imports + derive uid + transfer state**

At the top imports, add:
```tsx
import { createHandoff, cancelHandoff, readHost, writeHost } from './hostTransfer';
```
Inside `AppInner`, right after the `const canUndo = ...` / `prevStateRef` lines (near line 83), add:
```tsx
  const myUid = authUser?.uid ?? null;
  const [transferPending, setTransferPending] = useState(false);
```

- [ ] **Step 2: Write `host` on room creation**

Replace `handleCreateRoom` (currently lines ~130-137) with:
```tsx
  const handleCreateRoom = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => chars[b % chars.length])
      .join('');
    setRoomCode(code);
    setMode('host');
    if (myUid) writeHost(code, { uid: myUid, epoch: 1 });
  }, [myUid]);
```

- [ ] **Step 3: Adopt legacy rooms (write host if absent while hosting)**

After the existing spectator-subscribe effect (ends ~line 111), add:
```tsx
  useEffect(() => {
    if (mode !== 'host' || !roomCode || !myUid) return;
    readHost(roomCode).then(h => {
      if (!h) writeHost(roomCode, { uid: myUid, epoch: 1 });
    });
  }, [mode, roomCode, myUid]);
```

- [ ] **Step 4: Transfer + cancel handlers**

After `handleStopSharing` (ends ~line 143), add:
```tsx
  const handleTransferHost = useCallback(async () => {
    if (!roomCode) return;
    const token = await createHandoff(roomCode);
    setTransferPending(true);
    const url = `${window.location.origin}/?room=${roomCode}&claim=${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Captain Tavla', text: 'Take over hosting of our game', url });
      } catch {
        // share sheet cancelled — token stays valid, link is still shareable later
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Transfer link copied');
      } catch {
        alert(url);
      }
    }
  }, [roomCode]);

  const handleCancelTransfer = useCallback(async () => {
    if (!roomCode) return;
    await cancelHandoff(roomCode);
    setTransferPending(false);
  }, [roomCode]);
```

- [ ] **Step 5: Pass props to the main GameScreen**

In the final `return (<GameScreen ... />)`, after the `onSignOut={signOutUser}` line, add:
```tsx
      onTransferHost={mode === 'host' && roomCode ? handleTransferHost : undefined}
      onCancelTransfer={handleCancelTransfer}
      transferPending={transferPending}
```

- [ ] **Step 6: Build + tests**

Run: `npm run build` (Expected: passes — watch for unused `readHost`/`writeHost` if a step was skipped) then `npx vitest run` (Expected: 18 pass).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: host identity write + transfer-offer handlers in App"
```

---

### Task 5: App — claim flow (gate + ClaimHostScreen + hydrate)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `claimHost` from `./hostTransfer`; `ClaimHostScreen`; `GameState`.
- Produces: a `HYDRATE` case in `undoReducer`; a claim render branch.

- [ ] **Step 1: Add imports**

Add a new import for the component:
```tsx
import ClaimHostScreen from './components/ClaimHostScreen';
```
Then EDIT the existing `./hostTransfer` import line (added in Task 4) to also include `claimHost`. After this step it must read exactly:
```tsx
import { createHandoff, cancelHandoff, readHost, writeHost, claimHost } from './hostTransfer';
```
Do NOT add a second `import ... from './hostTransfer'` line.

- [ ] **Step 2: Add a `HYDRATE` case to `undoReducer`**

Change the `undoReducer` signature's action type and add the case. Replace the function header + the UNDO block top (lines ~22-33) so it reads:
```tsx
function undoReducer(
  state: UndoState,
  action: GameAction | { type: 'UNDO' } | { type: 'HYDRATE'; state: GameState }
): UndoState {
  if (action.type === 'HYDRATE') {
    return { current: action.state, history: [] };
  }

  if (action.type === 'UNDO') {
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1];
    return {
      current: prev,
      history: state.history.slice(0, -1),
    };
  }
```
(Leave the rest of `undoReducer` — the `RESET_GAME` and default delegation — unchanged. `GameState` is already imported at the top of App.tsx.)

- [ ] **Step 3: Add claim-URL parsing + claim state**

After `function getRoomCodeFromURL()` (ends ~line 50) add:
```tsx
function getClaimFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('claim');
}
```
Inside `AppInner`, right after `const urlRoom = getRoomCodeFromURL();` add:
```tsx
  const claimToken = getClaimFromURL();
```
And near the other `useState` calls (after `transferPending`), add:
```tsx
  const [claimStatus, setClaimStatus] = useState<'confirm' | 'claiming' | 'expired'>('confirm');
  const [claimDismissed, setClaimDismissed] = useState(false);
```

- [ ] **Step 4: Widen the auth gate to cover claim links**

Change the gate guard (currently `if (!urlRoom) {`) to:
```tsx
  // Pure spectator links (?room=, no claim) skip the gate. Claim links require sign-in.
  if (!urlRoom || claimToken) {
```
(The three `AuthGate` returns inside stay as-is.)

- [ ] **Step 5: Render the claim branch**

Immediately AFTER the gate block's closing `}` and BEFORE `if (mode === 'spectator') {`, insert:
```tsx
  if (urlRoom && claimToken && !claimDismissed) {
    const handleConfirmClaim = async () => {
      if (!myUid) return;
      setClaimStatus('claiming');
      const result = await claimHost(urlRoom, claimToken, myUid);
      if (!result.ok) { setClaimStatus('expired'); return; }
      if (result.state) dispatch({ type: 'HYDRATE', state: result.state });
      setRoomCode(urlRoom);
      setMode('host');
      setTransferPending(false);
      setClaimDismissed(true);
      window.history.replaceState({}, '', window.location.pathname);
    };
    const handleWatchInstead = () => {
      setRoomCode(urlRoom);
      setMode('spectator');
      setClaimDismissed(true);
      window.history.replaceState({}, '', `${window.location.pathname}?room=${urlRoom}`);
    };
    return (
      <ClaimHostScreen
        roomCode={urlRoom}
        status={claimStatus}
        onConfirm={handleConfirmClaim}
        onWatchInstead={handleWatchInstead}
      />
    );
  }
```

- [ ] **Step 6: Build + tests**

Run: `npm run build` (Expected: passes) then `npx vitest run` (Expected: 18 pass).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: claim flow — gate claim links, ClaimHostScreen, hydrate on takeover"
```

---

### Task 6: App — auto step-down + "hosting transferred" banner

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `subscribeHost`, `isStillHost` from `./hostTransfer`.

- [ ] **Step 1: Extend the hostTransfer import + add banner state**

Extend the `./hostTransfer` import to also include `subscribeHost, isStillHost`. Final:
```tsx
import { createHandoff, cancelHandoff, readHost, writeHost, claimHost, subscribeHost, isStillHost } from './hostTransfer';
```
Near the other `useState` calls add:
```tsx
  const [hostingTransferred, setHostingTransferred] = useState(false);
```

- [ ] **Step 2: Poll `host` while hosting; step down on takeover**

After the adopt effect from Task 4, add:
```tsx
  useEffect(() => {
    if (mode !== 'host' || !roomCode || !myUid) return;
    const unsub = subscribeHost(roomCode, info => {
      if (!isStillHost(info, myUid)) {
        setMode('spectator');
        setHostingTransferred(true);
      }
    });
    return () => unsub();
  }, [mode, roomCode, myUid]);
```
(When `mode` flips to `spectator`, the existing `writeRoom` effect — guarded on `mode === 'host'` — stops writing, and the existing spectator-subscribe effect takes over.)

- [ ] **Step 3: Auto-dismiss the banner after 5s**

Add:
```tsx
  useEffect(() => {
    if (!hostingTransferred) return;
    const t = setTimeout(() => setHostingTransferred(false), 5000);
    return () => clearTimeout(t);
  }, [hostingTransferred]);
```

- [ ] **Step 4: Render the banner in the spectator branch**

Replace the whole `if (mode === 'spectator') { ... }` block with a version that wraps its content and shows the banner:
```tsx
  if (mode === 'spectator') {
    const banner = hostingTransferred ? (
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 999,
          padding: '8px 16px',
          color: 'var(--text)',
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        Hosting transferred — you're now watching
      </div>
    ) : null;

    if (!roomCode || !spectatorState || spectatorState.screen === 'setup') {
      return (
        <>
          {banner}
          <SpectatorScreen roomCode={roomCode ?? 'unknown'} status="waiting" />
        </>
      );
    }

    return (
      <>
        {banner}
        <GameScreen
          state={spectatorState}
          dispatch={handleDispatch}
          onUndo={() => {}}
          canUndo={false}
          mode="spectator"
          roomCode={roomCode}
          onCreateRoom={() => {}}
          onStopSharing={() => {}}
        />
      </>
    );
  }
```

- [ ] **Step 5: Build + tests**

Run: `npm run build` (Expected: passes) then `npx vitest run` (Expected: 18 pass).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: auto step-down to spectator on takeover + transfer banner"
```

---

### Task 7: Narrow RTDB rules to protect the handoff token

**Files:**
- Modify: `database.rules.json`

- [ ] **Step 1: Replace `database.rules.json`**

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "rooms": {
      "$room": {
        "state": { ".read": true }
      }
    }
  }
}
```
(Public read now covers only `rooms/<CODE>/state` — spectators still work; `host`/`handoff` and the room list require auth, so the transfer token is not exposed. Writes stay `auth != null`.)

- [ ] **Step 2: Commit**

```bash
git add database.rules.json
git commit -m "feat: narrow RTDB public read to room state only (protect handoff token)"
```

- [ ] **Step 3: (Controller, after merge) deploy rules + verify**

Not an agent step — the controller runs:
```bash
firebase deploy --only database
```
Then verifies: an unauthed read of `/rooms/<CODE>/handoff.json` returns `Permission denied`, while `/rooms/<CODE>/state.json` still returns data/null.

---

## Post-implementation manual verification (user, two devices)
1. Device A (allowlisted): start a game, "Share Read-Only" → hosting. Menu → "Transfer Host" → share the link to Device B.
2. Device B (allowlisted, different Google account): open the link → sign in if needed → "Take over hosting" → sees the current game and can now edit.
3. Device A: within ~3s auto-drops to spectator with the "Hosting transferred" banner; edits made on B appear on A live.
4. Spectator link recipients (no claim param) still just watch, no sign-in.
5. Expired path: open a used/stale claim link → "This transfer link is no longer valid" → "Watch as spectator" works.
