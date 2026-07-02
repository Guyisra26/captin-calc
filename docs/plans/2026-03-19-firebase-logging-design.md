# Firebase Activity Logging — Design

## Goal

Log every game (local and hosted) to Firebase permanently, so activity is visible even after rooms are deleted. Zero changes to game logic.

---

## Firebase Structure

```
/logs
  /{gameId}
    gameId: string
    roomCode: string | null       -- added only when host room is created
    createdAt: number             -- Unix ms timestamp
    status: 'active' | 'ended'
    endedAt: number | null
    players: { id: string, name: string }[]
    /rounds
      /{roundNumber}
        roundNumber: number
        captainName: string
        representativeName: string
        winner: 'captain' | 'teamB'
        winType: 'normal' | 'mars' | 'turkish'
        doublings: number
        removals: string[]           -- removed player names
        finalPerPlayerStake: number
        balanceChanges: Record<string, number>
        completedAt: number
```

---

## Event Triggers

| Event | What is written |
|-------|----------------|
| `START_GAME` dispatched | `/logs/{gameId}` — full room metadata, status: active |
| Room created (`handleCreateRoom`) | `/logs/{gameId}/roomCode` — patch roomCode onto existing entry |
| `RESOLVE_ROUND` result | `/logs/{gameId}/rounds/{n}` — round summary |
| `RESET_GAME` dispatched | `/logs/{gameId}` — status: ended, endedAt |

---

## Key Decisions

- **gameId** is generated once at `START_GAME` time, stored in a React ref in `App.tsx`. Cleared on `RESET_GAME`.
- **All games are logged** — local and hosted. If a local game is promoted to host, `roomCode` is patched onto the existing log entry.
- **Logs are never deleted** — only the `/rooms` path (live sync) is deleted. `/logs` is permanent.
- **No changes to**: `gameReducer.ts`, `types.ts`, `firebaseSync.ts`, or any component file.

---

## New File: `src/firebaseLog.ts`

Three functions:

```ts
logGameStart(gameId, players, roomCode?)   // PATCH /logs/{gameId}
logRoomCode(gameId, roomCode)              // PATCH /logs/{gameId}/roomCode
logRoundComplete(gameId, roundSummary)     // PUT /logs/{gameId}/rounds/{n}
logGameEnded(gameId)                       // PATCH /logs/{gameId}/status + endedAt
```

---

## Changes to `App.tsx`

- Add `gameIdRef = useRef<string | null>(null)`
- `useEffect` on `state` watching for `START_GAME` → generate gameId, call `logGameStart`
- `useEffect` on `roomCode` change (when host room created) → call `logRoomCode`
- `useEffect` on `state.roundHistory` length change → call `logRoundComplete` for latest round
- In `handleDispatch` on `RESET_GAME` → call `logGameEnded` before clearing gameId
