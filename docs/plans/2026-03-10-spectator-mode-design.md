# Spectator Mode Design
**Date:** 2026-03-10
**Status:** Approved

## Overview

Add a real-time read-only spectator mode. One user (host) manages the game as always. Others join via a 6-character room code and see the game state update live.

---

## Architecture

### Data Flow

```
Firebase Realtime Database
  /rooms/{roomCode}/state  ← full GameState as JSON

Host:
  dispatch → undoReducer → gameReducer
                               ↓
                    writeRoom(roomCode, state)  [Firebase]
                  + saveGameState(localStorage) [as before]

Spectator:
  subscribeRoom(roomCode, onValue) → local read-only state
```

### App Modes

| Mode        | Condition              | Behavior                          |
|-------------|------------------------|-----------------------------------|
| `local`     | No room created        | Exactly as today, localStorage only |
| `host`      | User created a room    | Writes to Firebase on every state change |
| `spectator` | URL has `?room=ABC123` | Subscribes to Firebase, UI is read-only |

### URL Scheme

- Host: `/` (no change)
- Spectator: `/?room=ABC123` — presence of `?room=` triggers spectator mode automatically on load

### Room Code

6 uppercase alphanumeric characters. Generated with `crypto.randomUUID().slice(0,6).toUpperCase()`.

---

## Firebase

### Changes to `firebase.ts`

Add Realtime Database initialization:
```ts
import { getDatabase } from 'firebase/database';
export const db = getDatabase(app);
```

### New file: `src/firebaseSync.ts`

Three functions:
- `writeRoom(roomCode, state)` — writes full GameState to `/rooms/{roomCode}/state`
- `subscribeRoom(roomCode, cb)` — `onValue` listener, returns unsubscribe function
- `deleteRoom(roomCode)` — removes `/rooms/{roomCode}` (called on game reset by host)

### Security Rules (Firebase Console)

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

No auth required — access is gated by knowing the room code. Acceptable for private/social use.

---

## UI Changes

### SetupScreen

After the "mode" step (fresh vs resume), add an optional step:
**"Share this game?"** — "Create sharing room" button generates a roomCode and sets mode to `host`. "Skip" continues as `local`.

Alternatively: add a "Share" button in the game header that creates the room lazily (after game starts).
**Decision: lazy creation from GameScreen header** — simpler flow, doesn't add a setup step.

### GameScreen (host mode)

- Header shows room code badge: `Room: ABC123 [Copy Link]`
- Copy Link copies `https://<host>/?room=ABC123` to clipboard

### GameScreen (spectator mode)

- Full `GameScreen` UI rendered with the remote state
- All action buttons (`dispatch`) are disabled/hidden
- Top banner: `👁 LIVE — Room ABC123`
- If room doesn't exist yet (host hasn't started): show "Waiting for host..." screen
- If room is deleted (host reset): show "Game ended" screen

---

## What Does NOT Change

- `gameReducer.ts` — zero changes
- All components (`RoundPanel`, `Scoreboard`, `EventLog`, `RoundHistory`, `SetupScreen`) — zero changes to logic
- `storage.ts` (localStorage) — continues to work as host's local backup
- Undo — host only (spectators have no undo concept)

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/firebase.ts` | Add `getDatabase` export |
| `src/firebaseSync.ts` | New — `writeRoom`, `subscribeRoom`, `deleteRoom` |
| `src/App.tsx` | Add mode state (`local`/`host`/`spectator`), sync effect, URL parsing |
| `src/components/GameScreen.tsx` | Room code banner (host), read-only overlay (spectator) |
| `src/components/SpectatorScreen.tsx` | New — waiting/ended screens |

---

## Out of Scope

- Authentication
- Multiple simultaneous hosted games per user (supported naturally by room codes)
- Spectator chat or reactions
- Host transfer
