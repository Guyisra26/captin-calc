# Warm Table Redesign — Implementation Plan

Spec: `docs/plans/2026-11-19-warm-table-redesign-design.md` (read it first; it is the
source of truth). Branch: `warm-table-redesign`. Implementers: Sonnet subagents.
Implementers do NOT commit — the orchestrator commits after each task's review.

## Task 1 — Warm theme in `src/index.css` (+ fonts)

**Files:** `src/index.css` only.

1. Replace the Google Fonts `@import`: load Cinzel (600/700/900), Lora (400/500/600 +
   italic 400), Rubik (keep existing weights). Remove Bricolage Grotesque and
   Instrument Sans.
2. Swap `:root` token values per the spec's palette table. Keep every token NAME that
   components reference. Recompute derived tokens (`--accent-dim`, `--accent-border`,
   `--positive-dim`, `--negative-dim`, `--border`, `--border-strong`) from the new hues.
   Add `--felt`, `--felt-border`. Repurpose the pivot color to copper `#d08a5a`
   (rename `--violet` → `--pivot` ONLY if you update every usage in CSS; component
   files are task 2/3 territory — if any .tsx references `--violet`, keep the old name
   as an alias pointing at copper).
3. `--font-display: 'Cinzel', 'Rubik', serif;`, `--font-body: 'Lora', 'Rubik', Georgia, serif;`.
4. Body background: static warm wood gradient + subtle SVG noise (opacity ≤0.04) + two
   faint radial glows. No animation.
5. Restyle `.btn` family per spec: Cinzel, tactile depth (`0 2px 0` darker base,
   press compress), `.btn-captain` gold gradient, `.btn-teamb` espresso/cream,
   `.btn-pivot` copper, `.btn-success`/`.btn-danger`/`.btn-mars`/`.btn-turkish` warm
   equivalents, `.btn-ghost` warm translucent. Keep min-heights, focus-visible rings,
   `.btn-disabled`.
6. `.card` warm surface (radius 14–16px, soft shadow); add new `.card--felt` variant
   (deep green felt, subtle radial shading, 1px inset gold-dark ring).
7. Add `.board-points-strip`: ~12px tall, full-width, repeating alternating triangles
   (inline SVG data-URI background, gold `#c9932c` at low opacity / espresso), no
   layout shift, `pointer-events: none`.
8. Recolor sweep of remaining classes: `.app-header`, `.brand`, `.top-live-pill`,
   `.undo-chip`, `.menu-toggle/.menu-pop/.menu-item`, `.board-input` (+select chevron
   SVG stroke color → warm), `.badge-*`, `.modal-overlay/.modal-card`, `.delta-chip`,
   `.doubling-cube`, `.section-label`, scrollbar.
9. Preserve: safe-area padding, `prefers-reduced-motion` block, anti-double-dimming
   rule (alpha-based dim tokens, no stacked opacity), AA contrast for text tokens on
   all three surfaces.

**Verify:** `npm run build` passes. No `.tsx` edits.

## Task 2 — ActionBoard replaces ActionWheel

**Files:** new `src/components/ActionBoard.tsx`; edit `src/components/RoundPanel.tsx`;
delete `src/components/ActionWheel.tsx`.

1. `ActionBoard.tsx`: same props contract as ActionWheel —
   `{ stake, captainName, canDoubleCaptain, canDoubleTeamB, bottomAction: 'initial' | 'pivot' | null, pivotStake, onDoubleCaptain, onDoubleTeamB, onPivot, onInitialDouble, onEndRound }`.
   Layout per spec: 2-col grid of `Captain ×2` (`.btn-captain`) and `Crew ×2`
   (`.btn-teamb`), each with a small subtitle line `→ {stake * 2}`; full-width copper
   `.btn-pivot` row for `bottomAction` (`Initial ×2 → {stake*2}` when `'initial'`,
   `{label} Pivot → {pivotStake}` when `'pivot'`, omitted when `null`); full-width
   `.btn-success` `End Round`. Min-height 64px on the doubling buttons, 56px elsewhere.
   Disabled doubling buttons use the native `disabled` attribute + `.btn-disabled`
   (still rendered, dimmed). No SVG wheel, no stake hub.
2. `RoundPanel.tsx`: replace the ActionWheel import/JSX with ActionBoard (same props
   you find at the current call site); add `card--felt` to the active-round root card
   (`<div className="card card--felt space-y-4">` — the second `return` only, NOT the
   between-rounds card).
3. Delete `ActionWheel.tsx`. Confirm nothing else imports it (`grep -r ActionWheel src/`).

**Verify:** `npm run build` passes, `npx vitest run` — all 17 tests pass.

## Task 3 — Triangle strip + component color sweep

**Files:** `src/components/GameScreen.tsx`, plus surgical recolors in other `.tsx`
files; `src/index.css` only if a token/class from task 1 needs a small fix.

1. `GameScreen.tsx`: render `<div className="board-points-strip" aria-hidden="true" />`
   immediately after the `.app-header` div (before the sharing-code bar). Only here.
2. Audit hardcoded colors in components that clash with the warm palette and move them
   to tokens: cold `rgba(255,255,255,…)` chip/border fills in RoundPanel/EventLog/
   RoundHistory/Scoreboard (warm cream alphas or surface tokens), the resolve-panel
   green `rgba(87,201,138,0.35)` borders (derive from the new `--color-positive`),
   any `--violet` reference. Do NOT touch logic, props, or layout structure.
3. Full verify: `npm run build`, `npx vitest run` (17/17).

**Verify:** screenshots at 390px via the preview (orchestrator does visual pass).

## Review protocol

After each task: a reviewer agent checks the diff against this plan + the spec,
focusing on (a) no logic changes, (b) token-name compatibility, (c) AA contrast,
(d) focus/disabled/reduced-motion preservation, (e) no leftover cold-palette values.
Orchestrator commits after review. Final whole-branch review + live preview
verification before merge/deploy (deploy only with Guy's approval).
