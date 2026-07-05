# Host Transfer — Design Document

**Date:** 2026-07-03

## Goal
Let the current host (the one device editing the game) hand editing control to another
player mid-game, so the game continues if the host has to leave. Transfer is
**deliberate only** (the host presses a button before leaving); sudden disappearance is
out of scope. The recipient is chosen via a **personal one-time transfer link**. After
a successful takeover the old host **automatically becomes a spectator** of the same room.

## Background (current architecture)
- Game state lives in the host device's `localStorage` and is the source of truth.
- Host writes `state` to `rooms/<CODE>/state` in Firebase RTDB; spectators poll-read it.
- `?room=CODE` links are public read-only and bypass the auth gate; everything else
  requires Google sign-in + email allowlist.
- Sync helpers: `src/firebaseSync.ts` (`writeRoom`, `subscribeRoom`, `deleteRoom`,
  `authedFetch`). App wiring + mode (`local`|`host`|`spectator`) in `src/App.tsx`.
- RTDB rules today: root `auth != null` read/write, with public read on `rooms/$room`.

## Approach (chosen: A — "relay baton" in the room)
State and a transfer token live in the room itself, so transfer works even if the old
host closes the app after pressing Transfer. Coordination is via an `epoch` counter, not
hard rule enforcement (acceptable for a closed friends group).

## Room schema (RTDB)
```
rooms/<CODE>/
  state    (unchanged: JSON string of GameState)
  host     { uid: string, epoch: number }         // current host + monotonically rising epoch
  handoff  { token: string, createdAt: number } | absent   // pending transfer offer
```
- On room creation the host writes `host = { uid: <creator>, epoch: 1 }` alongside the
  first `state` write.
- Legacy rooms created before this feature have no `host`; the current host device
  **adopts** them by writing `host = { uid: <me>, epoch: 1 }` on its next write if `host`
  is absent.

## Flow 1 — Offer transfer (host device)
1. Menu item **"Transfer Host"** (visible only in `host` mode).
2. Generates a random one-time `token` (same char set/entropy approach as room codes,
   e.g. 12 chars from `crypto.getRandomValues`).
3. Writes `handoff = { token, createdAt: Date.now() }` to the room.
4. Opens native share (Web Share API, clipboard fallback) with URL
   `${origin}/?room=CODE&claim=TOKEN` and text "Take over hosting of our game".
5. While a handoff is pending, the menu also shows **"Cancel Transfer"** (deletes
   `handoff`). Pressing "Transfer Host" again replaces the token (overwrites `handoff`).

## Flow 2 — Claim (recipient device)
1. Opening `?room=CODE&claim=TOKEN` — the `claim` param means the **auth gate DOES apply**
   (unlike a plain spectator link): recipient must be signed in + allowlisted. If not
   allowlisted → the normal "No access" screen.
2. Once authed, render **`ClaimHostScreen`**: "Take over hosting of room CODE?" with
   Confirm / "Just watch instead".
3. On Confirm, in order:
   a. Read `rooms/CODE/handoff`. If missing or `token` mismatch → show "This transfer
      link is no longer valid" + a "Watch as spectator" button (drops to spectator mode
      on `?room=CODE`).
   b. Read current `rooms/CODE/host` to get `epoch` (default 0 if absent).
   c. Write `host = { uid: <me>, epoch: epoch + 1 }`.
   d. Delete `handoff`.
   e. Read `rooms/CODE/state`, hydrate it into local reducer state + `localStorage`
      (via existing storage helpers), set mode `host`, `roomCode = CODE`.
   f. Strip `claim`/`room` params from the URL (history.replaceState) so a refresh
      doesn't re-trigger the claim.
4. Undo history does NOT transfer — new host starts with an empty undo stack (documented
   limitation).

## Flow 3 — Old host steps down
- While in `host` mode, the device polls `rooms/CODE/host` (~3s, reuse the polling
  pattern from `subscribeRoom`).
- When the observed `host.uid` differs from this device's uid (or `epoch` exceeds the
  epoch this device last wrote), the device:
  1. Immediately stops writing `state` (guard the write effect on "am I still host").
  2. Switches to `spectator` mode on the same `roomCode`.
  3. Shows a transient banner "Hosting transferred — you're now watching."
- Race window (~3s) where the old host may push one stale `state` after takeover is
  accepted as a known, negligible limitation for this use case.

## Security rules change (tightening)
Currently the whole `rooms/$room` node is public-read, which would expose `handoff.token`.
Narrow public read to `state` only; keep `host`/`handoff` readable to authed users only:
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
Writes stay `auth != null` (root). Epoch is coordination, not hard enforcement — consistent
with the app's threat model (closed friends group). `firebaseSync` spectator reads target
`rooms/CODE/state.json` (still public); claim/host reads use `authedFetch` (authed).

## Files
- `src/hostTransfer.ts` (new) — pure-ish helpers over `authedFetch`:
  `createHandoff(code)`, `cancelHandoff(code)`, `readHandoff(code)`, `readHost(code)`,
  `writeHost(code, uid, epoch)`, `claimHost(code, token, myUid)` (does read-verify-write-
  delete-fetchState, returns `{ ok, state } | { ok:false, reason }`), and a
  `subscribeHost(code, cb)` poller. Reuses `getIdToken`/`authedFetch`.
- `src/components/ClaimHostScreen.tsx` (new) — dark-premium confirm/expired screen.
- `src/App.tsx` — parse `claim` param; when present + authed, render ClaimHostScreen;
  add host-uid poll effect in host mode; guard the `writeRoom` effect on still-host;
  write `host` on room create/adopt; expose transfer handlers to GameScreen.
  **Critical — auth gate condition:** today the gate is skipped whenever `?room=` is
  present. It must now be skipped ONLY for a pure spectator link (`room` present AND
  `claim` absent). A claim link (`room` + `claim`) MUST go through the auth gate, so
  change the skip condition from `if (!urlRoom)` to `if (!urlRoom || claimToken)` (i.e.
  gate applies whenever there is a claim token). The ClaimHostScreen therefore only ever
  renders for an authed, allowlisted user.
- `src/firebaseSync.ts` — add `host`/`handoff` read/write helpers OR keep them in
  hostTransfer.ts (prefer hostTransfer.ts to keep sync focused on `state`); ensure the
  room-create path writes `host`.
- `src/components/GameScreen.tsx` — "Transfer Host" and (conditional) "Cancel Transfer"
  menu items; new props `onTransferHost`, `onCancelTransfer`, `transferPending`.
- `database.rules.json` — narrowed public read as above.

## Testing
- vitest for pure logic: token generation shape; `claimHost` decision logic with a mocked
  fetch (valid token → ok+state; missing/mismatched token → reason; epoch increments);
  "am I still host" comparison (uid/epoch).
- Build passes; existing 8 tests still pass.
- Manual end-to-end (two devices, two allowlisted Google accounts) — done by the user;
  the preview env cannot complete Google sign-in.

## Out of scope (YAGNI)
- Automatic failover on host disappearance (deliberate transfer only).
- Presence/roster of connected spectators.
- Hard rule-level enforcement of single-writer (epoch is advisory).
- Transferring the undo history.
