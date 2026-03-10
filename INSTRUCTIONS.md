# Captain Game Calculator — Instructions & Workflow

## Overview
A local-first web app to track stakes, doublings, captain removals, and player balances for the "Captain" card game. iPad-optimized, zero-sum enforced.

---

## Game Rules Summary

### Players & Teams
- N players (N ≥ 2), one is **Captain** (Team A), rest are **Team B**
- Each round: Captain vs **Representative** (first in Team B order)

### Stakes (per round, resets to 1)
- Each Team B player risks **1 point** base
- Captain risks **(N-1) × per-player stake**
- Doublings: 1 → 2 → 4 → 8 → ... (alternating proposal rights)

### Removal (Captain's option)
- Only when Team B proposes doubling AND Captain accepts
- Removed player immediately wins their **current** per-player stake (before the new doubling takes effect)
- Captain loses that amount to each removed player
- Round continues with fewer active Team B players

### Round Resolution
- **Captain wins**: each active Team B player loses current stake to Captain
- **Team B wins**: Captain loses current stake to each active Team B player
- Removed players already settled — unaffected by resolution

### Captain Rotation
- Captain wins → stays Captain, next Team B player becomes Representative
- Team B wins → Representative becomes new Captain, old Captain joins Team B

### Zero-Sum Invariant
- `sum(all_balances) === 0` after every single operation

---

## Architecture

### Tech Stack
- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** — iPad-first responsive design
- **localStorage** — persistence, no backend
- **useReducer** — game state management

### File Structure
```
src/
├── types.ts            # All TypeScript interfaces
├── gameReducer.ts      # Core game logic (pure reducer)
├── validation.ts       # Zero-sum checks, action guards
├── localStorage.ts     # Save/load helpers
├── App.tsx             # Root component, screen routing
├── components/
│   ├── SetupScreen.tsx     # Player input, captain selection, ordering
│   ├── GameScreen.tsx      # Main game layout
│   ├── Scoreboard.tsx      # Player balances table
│   ├── RoundPanel.tsx      # Current round state + controls
│   ├── EventLog.tsx        # Round event history
│   ├── RoundHistory.tsx    # Multi-round history
│   └── PlayerOrderList.tsx # Drag-and-drop team B ordering
└── index.css           # Tailwind directives + custom styles
```

### State Shape
```typescript
GameState {
  players: Player[]           // { id, name, balance }
  captainId: string
  teamBOrder: string[]        // player IDs in order
  currentRound: RoundState    // stakes, doublings, removals, events
  roundHistory: RoundSummary[]
  screen: 'setup' | 'game'
}
```

---

## Development Workflow

1. ✅ Create this document
2. Scaffold Vite + React + TS + Tailwind
3. Implement types + gameReducer (pure logic, testable)
4. Build SetupScreen (player entry, captain pick, team B ordering)
5. Build GameScreen (scoreboard, round panel, controls, event log)
6. Add localStorage persistence
7. Polish: README, edge cases, iPad testing

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | useReducer | Pure functions, easy to test, predictable |
| Styling | Tailwind CSS | Fast iteration, responsive utilities, no CSS files |
| Drag & drop | Native touch events | No extra dependency, works on iPad Safari |
| Storage | localStorage | Simple, no backend needed, JSON serialize |
| ID generation | crypto.randomUUID() | Built-in, unique enough for local app |
