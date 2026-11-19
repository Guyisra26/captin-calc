# Game Table Upgrade — Plan

Approved by Guy 2026-11-19. Goal: the active-round felt card keeps its exact UX
(same elements, same buttons, same flow) but stops looking like "black boxes on
green" — the pieces should feel like parts of a real card table.

**Files:** `src/index.css` + `src/components/RoundPanel.tsx` (active-round return
only). Zero logic changes: no handler, prop, condition, or text-content changes.
Do NOT touch the between-rounds card (first `return`), removal picker logic,
resolve panels' structure, or ActionBoard.

## A. Doubling cube → real cube (`.doubling-cube`, CSS only)

Ivory/bone cube with espresso numeral — pops on felt like a real doubling cube:

- `background: linear-gradient(145deg, #f7ecd2, #dcc693)`; `color: #38220e`;
  `border: none`; `border-radius: 10px`; keep 48×48, font unchanged.
- Depth: `transform: rotate(-4deg)`;
  `box-shadow: 2px 3px 0 rgba(0,0,0,0.35), 0 5px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.12)`.
- No animation. Contrast espresso-on-ivory is far above AA.

## B. Stats engraved on the felt (`.felt-stats` / `.felt-stat`)

Replace the three `--surface-2` boxes in the Stakes Grid with numbers printed
directly on the felt:

- JSX: swap the mapped box `div`s' inline styles for classes:
  `<div className="felt-stats">` wrapping three `<div className="felt-stat">`.
  Keep the same label/value data array and value colors
  (Per Player `var(--text)`, Active Crew `var(--text-dim)`, Captain Risk `var(--accent)`).
- CSS: `.felt-stats { display: grid; grid-template-columns: repeat(3, 1fr); }`
  (replaces the Tailwind grid classes). `.felt-stat { padding: 0.5rem 0.25rem; text-align: center; background: none; }`
  Dividers: `.felt-stat + .felt-stat { border-left: 1px solid rgba(201,147,44,0.22); }`
  Value: keep `1.6rem`, 700, tabular-nums, add `text-shadow: 0 1px 1px rgba(0,0,0,0.45)`
  (printed-on-table feel). Labels: `section-label` but ensure color is
  `var(--text-dim)` on felt (no `--text-faint` — AA).

## C. Captain / Representative plaques (`.plaque`, `.plaque--captain`, `.plaque--rep`)

Replace the two inline-styled name boxes:

- `.plaque`: `padding: 0.6rem 1rem; border-radius: 10px; font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; text-align: center;`
- `.plaque--captain` (gold nameplate):
  `background: linear-gradient(180deg, rgba(201,147,44,0.24), rgba(201,147,44,0.10)); border: 1px solid var(--accent); box-shadow: inset 0 0 0 2px rgba(20,11,5,0.35), 0 2px 6px rgba(0,0,0,0.3); color: var(--accent-strong);`
  Prepend a small anchor glyph in JSX: `<span aria-hidden="true" style={{ fontSize: '0.8em', marginInlineEnd: '0.35em' }}>⚓</span>`
  (JSX span, not CSS content — screen readers must skip it).
- `.plaque--rep` (dark wood):
  `background: linear-gradient(180deg, #33200f, #241507); border: 1px solid var(--border-strong); box-shadow: inset 0 1px 0 rgba(242,228,196,0.08), 0 2px 6px rgba(0,0,0,0.3); color: var(--text);`
- The `VS` separator: color `var(--accent)`, size 0.85rem, letter-spacing 0.05em.
- Keep the `section-label` headings (Captain / Representative) as-is.

## D. Stitched felt border (`.card--felt::after`)

- `.card--felt { position: relative; }`
- `.card--felt::after { content: ''; position: absolute; inset: 7px; border: 1px dashed rgba(201,147,44,0.28); border-radius: 11px; pointer-events: none; }`
- Decorative only; must not capture events or affect layout.

## E. Crew chips → checker/token look (`.crew-chip`, `--rep`, `--out`)

Replace the inline-styled crew `<span>`s with classes (same text logic:
name, `(out)`, `★`):

- `.crew-chip`: `display: inline-flex; align-items: center; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.9rem; color: var(--text-dim); background: radial-gradient(circle at 30% 25%, rgba(242,228,196,0.13), rgba(242,228,196,0.04)); box-shadow: inset 0 0 0 1px rgba(242,228,196,0.16), inset 0 0 0 3px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.3);`
  (the double inset ring = backgammon checker).
- `.crew-chip--rep`: `color: var(--text); font-weight: 600; box-shadow: inset 0 0 0 1px var(--accent), inset 0 0 0 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3);`
- `.crew-chip--out`: `background: none; box-shadow: none; color: var(--color-removed); text-decoration: line-through;`

## Constraints & verification

- No new animations; nothing to add to the reduced-motion block.
- AA contrast on felt: values/labels per B; plaque text per C (gold-strong on
  gold-dim ≥ 4.5 — verify, darken the plaque background if needed).
- `npm run build` passes, `npx vitest run` 17/17.
- Beware: a PostToolUse formatter may rewrite entire files on Edit — if the diff
  fills with quote-style churn beyond your change, revert and reapply surgically.
- Review (diff vs this plan: no logic changes, contrast, decorative elements
  aria-hidden/pseudo) → orchestrator commits → visual pass at 390px in preview.
