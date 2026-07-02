# Dark Premium Redesign — Design Document

**Date:** 2026-07-02

---

## Goal

Replace the current "medieval" wood-and-gold theme with a clean, elegant, dark-premium
visual language across the active app flow. Mobile-first: the product is used mostly
on phones. No game-logic or component-structure changes — this is a reskin plus one
UX upgrade (floating Undo).

## Scope

Screens: **Setup, Game, Summary, Spectator** and their child components
(Scoreboard, RoundPanel, EventLog, RoundHistory, RemovePlayerModal, modals/menus).
Out of scope: Login/Dashboard/Admin (currently disconnected from the flow), backend,
gameReducer.

## Approach

Token-first restyle (approach A): define a new design-token system in `index.css`,
then sweep each screen to the new language. Keep layouts and component structure;
add micro-animations where cheap.

## Visual Language

### Color tokens

| Token | Role | Direction |
|---|---|---|
| `--bg` | app background | charcoal near-black (~#0C0E12) |
| `--surface` / `--surface-2` | cards, raised panels | stepped lighter grays, no gradients |
| `--border` | card borders | thin, semi-transparent white (~8-12% alpha) |
| `--accent` | primary actions, Captain identity | refined champagne-gold, matte (no glitter/gradient shine) |
| `--positive` / `--negative` | balances +/- | muted green / muted red, readable on dark |
| `--text` / `--text-dim` | primary / secondary text | off-white / ~60% alpha |

All old tokens (`--wood-*`, `--gold-*`, `--cream*`) are removed, not aliased —
any leftover reference should fail visibly during the sweep.

### Typography

- Instrument Sans for body + Bricolage Grotesque for display headings (Google Fonts) — Cinzel serif removed. Distinctive but clean; avoids generic Inter/Space Grotesk.
- Balances and stakes use `font-variant-numeric: tabular-nums`.
- Hierarchy via weight and size, not decorative fonts.

### Surfaces & ornament

- Subtle rounded corners (~12-16px cards, ~10px buttons), 1px translucent borders.
- Soft single-layer shadows for elevation; no double gold frames, no wood gradients,
  no triangle border strips at screen edges.
- Primary button: solid accent fill, dark text; secondary: outlined/ghost.

### Floating Undo (UX change)

- Circular floating button, bottom-right corner (thumb zone), above other content.
- Visible only when `canUndo` is true; hidden in spectator mode.
- Replaces the Undo entry in the hamburger menu (menu keeps the rest).

### Micro-animations

- Balance change: brief highlight pulse on the changed row.
- Screen/modal transitions: short fade/slide (~150-200ms).
- Button press feedback: slight scale. Respect `prefers-reduced-motion`.

## Implementation shape

1. New token system + base styles + button/card utility classes in `index.css`.
2. Sweep screens one at a time: Game (+ children) → Setup → Summary → Spectator → modals.
3. Components currently using heavy inline styles (e.g. RemovePlayerModal) migrate
   to the shared utility classes where practical.
4. Floating Undo added in GameScreen.

## Testing / verification

- Visual pass on phone-sized viewport (~380px) for every screen in the flow.
- Grep confirms no `--wood`/`--gold`/`--cream`/Cinzel references remain.
- Undo FAB: appears after first action, disappears at zero history, absent for spectators.
- `npm run build` passes.
