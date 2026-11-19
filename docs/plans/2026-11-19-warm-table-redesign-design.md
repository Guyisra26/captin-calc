# Warm Table Redesign — Design Document

**Date:** 2026-11-19
**Approved by:** Guy (option 1 + triangle signature)

## Goal

Two changes, driven by UX feedback on the July 2026 "dark premium" redesign:

1. **Replace the radial ActionWheel with regular buttons.** The wheel looks novel but the
   old big labeled buttons were faster and more accessible. Restore that interaction
   model in a modern execution.
2. **Bring back the warmth of the original March 2026 theme** — dark wood, green felt,
   rich gold, cream — as a refined 2026 palette layered onto the _current_ app. This is
   NOT a revert: the app has moved on (auth gate, host transfer, Crew, safe-area, new
   components). We swap the design-token values and restyle shared classes; component
   structure and all game logic stay untouched.

Plus one signature flourish: a subtle backgammon-triangle strip (the "board points"
motif from the old theme) in exactly one place.

## What stays from the current design

- All component structure, layout, and logic (zero changes to gameReducer/App wiring).
- Token-driven styling: every component reads `var(--bg)`, `var(--accent)` etc., so the
  reskin is centralized in `src/index.css`.
- Modern structural wins: app-header with safe-area padding, undo chip, menu-pop,
  modal system, focus rings, `prefers-reduced-motion` support, 16px+ touch ergonomics.
- The anti-double-dimming rule (never stack `opacity` on text colored with
  `--text-dim`/`--text-faint`).

## Palette (token value swap, same token names)

Keep every existing token NAME; change values in `:root`:

| Token                   | New value        | Meaning                                                                                                                                                                          |
| ----------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bg`                  | `#140b05`        | deep warm wood-dark (was cold `#0b0d12`)                                                                                                                                         |
| `--surface`             | `#1d1309`        | warm brown card surface                                                                                                                                                          |
| `--surface-2`           | `#271a0d`        | raised surface                                                                                                                                                                   |
| `--surface-3`           | `#322112`        | highest surface                                                                                                                                                                  |
| `--accent`              | `#c9932c`        | the original rich gold (was champagne `#d4b36a`)                                                                                                                                 |
| `--accent-strong`       | `#e8c264`        | gold-light                                                                                                                                                                       |
| `--accent-ink`          | `#1a0f04`        | text on gold                                                                                                                                                                     |
| `--text`                | `#f2e4c4`        | cream (was blue-white `#edf0f5`)                                                                                                                                                 |
| `--text-dim`            | cream at ~65% α  | derived from cream, tuned for AA contrast                                                                                                                                        |
| `--text-faint`          | cream at ~40% α  |                                                                                                                                                                                  |
| `--color-positive`      | `#6fbf5a`-family | warm green, AA on surfaces                                                                                                                                                       |
| `--color-negative`      | `#d95f52`-family | warm brick red                                                                                                                                                                   |
| `--violet` → repurposed | `#d08a5a` copper | pivot color: violet clashes with wood; pivot becomes burnished copper (keep the token name `--violet` or rename to `--pivot` — implementer may rename if all usages are updated) |

New felt tokens for the game-table panel: `--felt: #123b24`,
`--felt-border: #2d6a44`, used only by the `.card--felt` variant.

Derived tokens (`--accent-dim`, `--accent-border`, `--positive-dim`, `--negative-dim`,
`--border`, `--border-strong`) recomputed from the new hues. All text/background pairs
must pass WCAG AA (4.5:1 body, 3:1 large text) — verify the final values.

## Materials & background

- Body background: static layered warm gradient (wood-dark vertical) + ultra-subtle SVG
  fractal-noise grain (opacity ≤0.04), + two faint radial glows (gold top-left, green
  bottom-right). **No `woodDrift` animation** — static only (battery, motion).
- `.card`: warm surface, soft shadow, 14–16px radius (keep modern geometry — no 2006
  double-ring gold frames).
- `.card--felt` (new variant): deep green felt background with subtle radial shading +
  a restrained 1px inner gold-dark ring. Applied ONLY to the RoundPanel active-round
  card — the "playing table" of the app.

## Typography

- `--font-display`: `'Cinzel', 'Rubik', serif` — the old royal serif, for brand,
  headings, buttons, labels. (Rubik covers Hebrew glyphs.)
- `--font-body`: `'Lora', 'Rubik', Georgia, serif` — warm readable serif for body.
- Numbers (scores, stakes): keep `font-variant-numeric: tabular-nums`; if Lora's
  figures look uneven in the scoreboard, numbers may use Rubik via a `.num` utility —
  implementer judgment, legibility wins.
- Update the Google Fonts `@import` in `src/index.css` (fonts load there, not in
  index.html). Remove Bricolage Grotesque / Instrument Sans.

## ActionWheel → ActionBoard

Delete `src/components/ActionWheel.tsx`. New `src/components/ActionBoard.tsx` with the
**same props contract** the wheel had (stake, captainName, canDoubleCaptain,
canDoubleTeamB, bottomAction `'initial' | 'pivot' | null`, pivotStake, and the five
callbacks), so `RoundPanel.tsx` changes only the import + JSX tag.

Layout (mobile-first, vertical stack):

```
┌─────────────────────────────────────┐
│  [ Captain ×2 ]    [ Crew ×2 ]      │   2-col grid, min-height 64px
│    → stake*2         → stake*2      │   subtitle shows resulting stake
├─────────────────────────────────────┤
│  [ Initial ×2 → N ]  (or)           │   full width, copper, only when
│  [ Pivot → N ]                      │   bottomAction is non-null
├─────────────────────────────────────┤
│  [        End Round        ]        │   full width, green, prominent
└─────────────────────────────────────┘
```

- Captain ×2: gold (`.btn-captain`), disabled (dimmed + `disabled` attr) when
  `!canDoubleCaptain`. Crew ×2: espresso-dark with cream text (`.btn-teamb`),
  disabled when `!canDoubleTeamB`.
- Subtitles ("→ 8") inside the button in smaller text — the consequence is visible
  before tapping (the accessibility win over the wheel).
- Native `<button disabled>` semantics, visible focus rings, ≥56px touch targets,
  active-press scale like the old tactile buttons.
- No stake hub needed: the doubling cube + stakes grid above already show the stake.

## Button restyle (shared `.btn-*` classes)

Modernized version of the old tactile buttons: Cinzel type, gentle vertical gradient,
1px lighter top edge + `0 2px 0` darker base (the old "piece" depth), press state
compresses (`translateY(1px)` + reduced shadow). Keep the shine sweep OFF (dated);
keep hover lift subtle. `.btn-pivot` becomes copper. `.btn-mars`/`.btn-turkish`
recolored to warm equivalents, same hierarchy as today.

## Triangle signature (one place only)

A decorative backgammon-points strip: slim SVG band (~12px tall) of alternating
gold/espresso triangles at **the bottom edge of the app-header**, full width,
`aria-hidden="true"`, opacity ~0.5 so it reads as texture, not clutter. Implemented as
a CSS background (inline SVG data-URI) on a `.board-points-strip` element rendered by
`GameScreen` (and only there — setup/summary/spectator keep clean headers for now).

## Files touched

1. `src/index.css` — token values, fonts @import, body background, `.btn-*`, `.card`
   - `.card--felt`, `.board-points-strip`, pills/badges/inputs/menu recolor sweep.
2. `src/components/ActionBoard.tsx` — new.
3. `src/components/RoundPanel.tsx` — import swap; add `card--felt` to the active-round
   card.
4. `src/components/ActionWheel.tsx` — deleted.
5. `src/components/GameScreen.tsx` — triangle strip under header.
6. Hardcoded one-off colors inside components (violet pivot references,
   `rgba(255,255,255,…)` chips, resolve-panel greens) — audited and recolored to tokens
   where they clash with the warm palette.

## Out of scope (YAGNI)

- Theme toggle / keeping dark-premium as an option.
- Restyling the dead screens (AdminScreen/LoginScreen/DashboardScreen).
- Any gameReducer/App logic change; undo, auth, host-transfer untouched.
- Background animations.

## Acceptance

- `npm run build` passes; all 17 vitest tests pass (no logic touched).
- Preview check at 390px width: active round flow (start → double → pivot → resolve),
  removal prompt, modals, setup screen, summary — all legible, warm, AA-contrast.
- No focus-ring regressions; `prefers-reduced-motion` still respected.
- ActionWheel fully gone (no dead import).
