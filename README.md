# Captain Calculator

A local-first web app to track stakes, doublings, captain removals, and player balances for the "Captain" card game.

**iPad-optimized** — touch-first, landscape layout, no backend needed.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser (or on iPad via your local network IP).

### Build for Production

```bash
npm run build
npm run preview
```

## How to Use

### Setup
1. Enter player names (minimum 2)
2. Select who starts as Captain
3. Set the Team B order (first player = Representative)
4. Tap "Start Game"

### During a Round
- **Doubling** — Team B and Captain alternate proposing doublings (stake ×2)
- **Removal** — After Team B doubles and Captain accepts, Captain can remove players (settled at pre-doubling stake)
- **End Round** — Select who won (Captain or Team B/Representative)

### After a Round
- Balances update automatically (zero-sum enforced)
- Captain rotates based on who won
- Tap "Start Round" to begin the next round

### Other Features
- **Undo** — tap Undo in the top bar to reverse any action
- **Persistence** — game state saves to localStorage automatically
- **History** — expand past rounds in the left panel to see details

## Game Rules

| Concept | Rule |
|---------|------|
| **Base Stake** | 1 point per Team B player per round |
| **Captain Risk** | (active Team B count) × per-player stake |
| **Doubling** | Alternates: Team B → Captain → Team B → ... |
| **Removal** | Only after Team B doubles; settled at pre-doubling stake |
| **Captain Wins** | Captain stays; next Team B player becomes Rep |
| **Team B Wins** | Rep becomes Captain; old Captain joins Team B |
| **Zero-Sum** | All balances always sum to 0 |

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- localStorage (no backend)

## Project Structure

```
src/
├── types.ts              # TypeScript interfaces
├── gameReducer.ts        # Core game logic (pure reducer)
├── storage.ts            # localStorage helpers
├── App.tsx               # Root + undo wrapper
├── components/
│   ├── SetupScreen.tsx   # Player setup, captain selection, ordering
│   ├── GameScreen.tsx    # Main game layout (landscape two-column)
│   ├── Scoreboard.tsx    # Player balances
│   ├── RoundPanel.tsx    # Round state + action controls
│   ├── EventLog.tsx      # Current round events
│   └── RoundHistory.tsx  # Past rounds summary
└── index.css             # Tailwind + custom styles
```
