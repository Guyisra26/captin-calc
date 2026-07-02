# Dark Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the active app flow (Setup, Game, Summary, Spectator + modals) from the wood-and-gold "medieval" theme to a clean dark-premium visual language, and move Undo from the hamburger menu to a floating button.

**Architecture:** Token-first restyle. Task 1 rewrites `src/index.css` with a new token system while **keeping all existing utility class names** (`.card`, `.btn-captain`, `.board-input`, `.badge-*`, `.top-live-pill`, `.doubling-cube`) so components restyle automatically where they use classes. Subsequent tasks sweep each component's inline styles to the new tokens and make structural changes (remove triangle strips, new header, FAB Undo). No game logic changes.

**Tech Stack:** React 19, Tailwind v4 (via `@tailwindcss/vite`), plain CSS custom properties, Google Fonts (Instrument Sans for body + Bricolage Grotesque for display).

**Testing note:** This project has no frontend unit-test infrastructure and the change is purely presentational, so TDD does not apply. Verification per task = `npm run build` passes + visual check in a ~380px-wide browser viewport (dev server: `npm run dev` → http://localhost:5173). Final task adds grep checks that no legacy theme references remain.

**Spec:** `docs/plans/2026-07-02-dark-premium-redesign-design.md`

---

## Global style mapping table

Apply these **exact transformations** wherever they appear in the component tasks below. They are mechanical string/value swaps for inline `style={{...}}` objects:

| Old (delete/replace) | New |
|---|---|
| `fontFamily: "'Cinzel', serif"` (any weights) | delete the property (body font inherits) — for section headings use `className="section-label"` instead (defined in Task 1) |
| `fontFamily: 'monospace'` | `fontVariantNumeric: 'tabular-nums'` |
| `color: 'var(--cream)'` | `color: 'var(--text)'` |
| `color: 'var(--cream-dark)'` | `color: 'var(--text-dim)'` |
| `color: 'var(--gold-light)'` or `'var(--gold)'` | `color: 'var(--accent-strong)'` / `'var(--accent)'` |
| `color: 'var(--gold-dark)'` (used as text color) | `color: 'var(--text-faint)'` |
| `var(--gold-dark)` (used as border color) | `var(--accent-border)` |
| `background: 'var(--wood-darkest)'` / `'var(--wood-dark)'` (screen backgrounds) | `background: 'var(--bg)'` |
| `background: 'var(--wood-mid)'` / wood gradients (raised bars/panels) | `background: 'var(--surface-2)'` |
| `rgba(200,150,40,0.08–0.12)` backgrounds | `var(--accent-dim)` |
| `rgba(200,150,40,0.2–0.35)` borders | `var(--accent-border)` |
| `rgba(0,0,0,0.2–0.3)` panel backgrounds | `var(--surface-2)` |
| `rgba(255,255,255,0.05–0.08)` borders | `var(--border)` |
| `borderRadius: '2px'`/`'3px'` (chips, badges) | `borderRadius: '6px'` |
| `borderRadius: '4px'` (boxes, rows, buttons) | `borderRadius: '10px'` (rows/inputs) or `'12px'` (panels/boxes) |

Rule of thumb for radii: inner panels/boxes `12px`, list rows/inputs `10px`, small chips/badges `6px`.

---

### Task 1: New design token system + base styles (`index.css` rewrite)

**Files:**
- Modify: `src/index.css` (full rewrite)

- [ ] **Step 1: Replace the entire contents of `src/index.css` with:**

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap');
@import "tailwindcss";

:root {
  /* surfaces */
  --bg: #0b0d12;
  --surface: #13161d;
  --surface-2: #1a1e27;
  --surface-3: #232834;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);

  /* accent — matte champagne gold */
  --accent: #d4b36a;
  --accent-strong: #e8cd8d;
  --accent-dim: rgba(212, 179, 106, 0.12);
  --accent-border: rgba(212, 179, 106, 0.3);
  --accent-ink: #16130a;

  /* text */
  --text: #edf0f5;
  --text-dim: rgba(237, 240, 245, 0.62);
  --text-faint: rgba(237, 240, 245, 0.38);

  /* semantic */
  --color-captain: var(--accent);
  --color-positive: #57c98a;
  --color-negative: #e0666c;
  --color-removed: #79808f;
  --positive-dim: rgba(87, 201, 138, 0.12);
  --negative-dim: rgba(224, 102, 108, 0.12);
  --violet: #a78bfa;
  --violet-dim: rgba(167, 139, 250, 0.14);
  --violet-border: rgba(167, 139, 250, 0.38);

  /* fonts */
  --font-body: 'Instrument Sans', system-ui, -apple-system, sans-serif;
  --font-display: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif;
}

* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  overscroll-behavior: none;
}

body {
  font-family: var(--font-body);
  color: var(--text);
  background-color: var(--bg);
  background-image: radial-gradient(80vw 50vh at 50% -10%, rgba(212, 179, 106, 0.05), transparent 60%);
  background-attachment: fixed;
}

/* ─── Animations ─── */
@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseDot {
  0% {
    box-shadow: 0 0 0 0 rgba(87, 201, 138, 0.5);
  }
  70% {
    box-shadow: 0 0 0 7px rgba(87, 201, 138, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(87, 201, 138, 0);
  }
}

@keyframes deltaIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  60% {
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes menuIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fabIn {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ─── App header ─── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  background: rgba(19, 22, 29, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  position: relative;
  z-index: 30;
  flex-shrink: 0;
}

.brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  color: var(--text);
  white-space: nowrap;
}

.brand-accent {
  color: var(--accent);
}

/* ─── Section label ─── */
.section-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 0.5rem;
}

/* ─── Base button ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1rem;
  min-height: 48px;
  min-width: 48px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

.btn:active {
  transform: scale(0.97);
}

.btn-captain {
  background: var(--accent);
  color: var(--accent-ink);
}

@media (hover: hover) {
  .btn-captain:hover {
    background: var(--accent-strong);
  }
}

.btn-teamb {
  background: var(--surface-3);
  color: var(--text);
  border-color: var(--border-strong);
}

@media (hover: hover) {
  .btn-teamb:hover {
    background: #2a3040;
  }
}

.btn-danger {
  background: var(--negative-dim);
  color: var(--color-negative);
  border-color: rgba(224, 102, 108, 0.4);
}

.btn-success {
  background: #2f9e6a;
  color: #08130c;
}

@media (hover: hover) {
  .btn-success:hover {
    background: #38b87c;
  }
}

.btn-ghost {
  background: transparent;
  color: var(--text-dim);
  border-color: var(--border);
}

@media (hover: hover) {
  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.btn-pivot {
  background: var(--violet-dim);
  color: var(--violet);
  border-color: var(--violet-border);
}

.btn-mars {
  background: rgba(232, 153, 80, 0.14);
  color: #e8a05f;
  border-color: rgba(232, 153, 80, 0.4);
}

.btn-turkish {
  background: var(--negative-dim);
  color: var(--color-negative);
  border-color: rgba(224, 102, 108, 0.4);
}

.btn-disabled {
  opacity: 0.35;
  pointer-events: none;
}

/* ─── Card ─── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 32px rgba(0, 0, 0, 0.35);
  animation: cardRise 0.3s ease both;
}

/* ─── Live status pill ─── */
.top-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(87, 201, 138, 0.3);
  background: var(--positive-dim);
  color: var(--color-positive);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.top-live-pill--idle {
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-faint);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--color-positive);
  animation: pulseDot 1.6s ease-out infinite;
}

/* ─── Menu (hamburger + dropdown) ─── */
.menu-toggle {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.menu-toggle span {
  display: block;
  width: 16px;
  height: 2px;
  border-radius: 1px;
  background: var(--text-dim);
  transition: all 0.2s;
}

.menu-toggle.open span:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.menu-toggle.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.menu-toggle.open span:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

.menu-pop {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  min-width: 220px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 100;
  animation: menuIn 0.15s ease both;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.8rem 1rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.menu-item:last-child {
  border-bottom: none;
}

@media (hover: hover) {
  .menu-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

/* ─── Floating Undo ─── */
.fab-undo {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  z-index: 90;
  cursor: pointer;
  transition: transform 0.12s ease;
  animation: fabIn 0.18s ease both;
}

.fab-undo:active {
  transform: scale(0.92);
}

/* ─── Modal ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 10, 0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal-card {
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 1.25rem;
  width: 100%;
  max-width: 380px;
  max-height: 85vh;
  overflow-y: auto;
  animation: cardRise 0.25s ease both;
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--surface-3);
  border-radius: 3px;
}

/* ─── Input fields ─── */
.board-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 1.05rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}

.board-input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.board-input::placeholder {
  color: var(--text-faint);
}

/* ─── Badges ─── */
.badge-captain {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: var(--accent-dim);
  color: var(--accent-strong);
  border: 1px solid var(--accent-border);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.badge-teamb {
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.badge-out {
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(121, 128, 143, 0.12);
  color: var(--color-removed);
  border: 1px solid rgba(121, 128, 143, 0.25);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

/* ─── Delta chip (scoreboard round change) ─── */
.delta-chip {
  animation: deltaIn 0.35s ease both;
}

/* ─── Doubling cube ─── */
.doubling-cube {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--surface-3);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  color: var(--accent-strong);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .pulse-dot,
  .delta-chip,
  .menu-pop,
  .fab-undo {
    animation: none !important;
  }

  .btn,
  .card,
  .menu-toggle span {
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `tsc -b && vite build` completes with no errors.

- [ ] **Step 3: Visual sanity check**

With `npm run dev` running, open http://localhost:5173 at ~380px width. Expected: background is now near-black charcoal, buttons/cards/inputs restyled. Inline-styled parts of components still reference deleted `--wood/--gold/--cream` vars and will render with missing colors — this is expected until Tasks 2–7 sweep them.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(design): new dark-premium token system and base styles"
```

---

### Task 2: GameScreen — header, menu, FAB Undo

**Files:**
- Modify: `src/components/GameScreen.tsx`

Structural changes: delete the `BoardPoints` component and both usages; replace top bar with `.app-header`; hamburger button → `.menu-toggle`; dropdown → `.menu-pop`/`.menu-item` (delete the `menuItemStyle` const); **remove the Undo menu item**; add the floating Undo button.

- [ ] **Step 1: Delete the `BoardPoints` function (lines 21–33) and both `<BoardPoints />` / `<BoardPoints flip />` usages**

- [ ] **Step 2: Delete the `menuItemStyle` const (lines 111–127)**

- [ ] **Step 3: Replace the root div + top bar block.** The root div becomes:

```tsx
<div className="h-full flex flex-col" style={{ background: 'var(--bg)' }}>
```

The top bar (previously the wood-gradient div with inline h1) becomes:

```tsx
<div className="app-header">
  <div className="flex items-center gap-2.5 min-w-0">
    <h1 className="brand">
      Captain <span className="brand-accent">Tavla</span>
    </h1>

    <span className={`top-live-pill ${roundActive ? '' : 'top-live-pill--idle'}`}>
      {roundActive && <span className="pulse-dot" />}
      {roundActive ? 'Round Live' : 'Paused'}
    </span>
    {isReadOnly && (
      <span className="top-live-pill top-live-pill--idle">Read Only</span>
    )}
  </div>

  {!isReadOnly && (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        className={`menu-toggle ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div className="menu-pop">
          {mode === 'local' && (
            <button
              onClick={() => {
                onCreateRoom();
                setMenuOpen(false);
              }}
              className="menu-item"
              style={{ color: 'var(--color-positive)' }}
            >
              ⚑ Share Read-Only
            </button>
          )}

          {mode === 'host' && roomCode && (
            <button onClick={handleCopyLink} className="menu-item" style={{ color: 'var(--color-positive)' }}>
              ⎘ Copy Spectator Link
            </button>
          )}

          {mode === 'host' && (
            <button
              onClick={() => {
                onStopSharing();
                setMenuOpen(false);
              }}
              className="menu-item"
              style={{ color: 'var(--accent)' }}
            >
              ☐ Stop Sharing
            </button>
          )}

          <button
            onClick={() => {
              setShowAddPlayer(v => !v);
              setMenuOpen(false);
            }}
            className="menu-item"
          >
            + Add Player
          </button>

          {state.players.length > 2 && (
            <button
              onClick={() => {
                setShowRemoveModal(true);
                setMenuOpen(false);
              }}
              className="menu-item"
            >
              − Remove Player
            </button>
          )}

          {onEndGame && !roundActive && (
            <button
              onClick={() => {
                onEndGame();
                setMenuOpen(false);
              }}
              className="menu-item"
              style={{ color: 'var(--accent)' }}
            >
              ⬛ End Game
            </button>
          )}

          <button onClick={handleReset} className="menu-item" style={{ color: 'var(--color-negative)' }}>
            ✕ New Game
          </button>
        </div>
      )}
    </div>
  )}
</div>
```

Note: the old `↩ Undo` menu item is intentionally gone.

- [ ] **Step 4: Restyle the sharing bar** (the `mode === 'host' && roomCode` block):

```tsx
<div
  className="px-3 py-1.5 shrink-0 flex items-center justify-between gap-2"
  style={{
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
  }}
>
```

(inner pill and Copy Link button keep their existing classes)

- [ ] **Step 5: Restyle the Add Player inline panel** container div:

```tsx
<div className="px-3 py-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
```

The duplicate-name `<p>` keeps `color: 'var(--color-negative)'` (token still exists).

- [ ] **Step 6: Restyle the main content area** — change `style={{ background: 'var(--wood-dark)' }}` to `style={{ background: 'var(--bg)' }}` on the `flex-1 overflow-auto p-3` div.

- [ ] **Step 7: Add the floating Undo button** immediately before the `showRemoveModal` block at the end of the root div:

```tsx
{!isReadOnly && canUndo && (
  <button className="fab-undo" onClick={onUndo} aria-label="Undo last action">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  </button>
)}
```

- [ ] **Step 8: Verify**

Run: `npm run build` → passes.
Visual check at 380px: new clean header with brand + pill; hamburger opens rounded dropdown without Undo; after performing any action (e.g. Start Round) a gold circular Undo button appears bottom-right, tapping it undoes and it disappears when history empties.

- [ ] **Step 9: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat(design): GameScreen dark header, menu restyle, floating Undo"
```

---

### Task 3: Scoreboard, EventLog, RoundHistory

**Files:**
- Modify: `src/components/Scoreboard.tsx`
- Modify: `src/components/EventLog.tsx`
- Modify: `src/components/RoundHistory.tsx`

- [ ] **Step 1: Scoreboard — replace the `<h3 style={{...Cinzel...}}>Scoreboard</h3>` with:**

```tsx
<h3 className="section-label" style={{ marginBottom: '0.75rem' }}>Scoreboard</h3>
```

- [ ] **Step 2: Scoreboard — player row.** Replace the row div's style with:

```tsx
<div
  key={p.id}
  className="flex items-center justify-between px-2.5 py-2"
  style={{
    borderRadius: '10px',
    background: isCaptain ? 'var(--accent-dim)' : 'var(--surface-2)',
    border: isCaptain ? '1px solid var(--accent-border)' : '1px solid transparent',
  }}
>
```

Rank number span: `style={{ color: 'var(--text-faint)', fontSize: '0.75rem', width: '1.1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}`.
Name span: `style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: isCaptain ? 600 : 400 }}`.

- [ ] **Step 3: Scoreboard — delta chip.** Add `className="delta-chip"` and restyle:

```tsx
<span
  className="delta-chip"
  style={{
    fontSize: '0.72rem',
    padding: '0.1rem 0.4rem',
    borderRadius: '6px',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    color: d > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
    background: d > 0 ? 'var(--positive-dim)' : 'var(--negative-dim)',
  }}
>
```

Balance span: swap `fontFamily: 'monospace'` → `fontVariantNumeric: 'tabular-nums'`, and `var(--cream-dark)` → `var(--text-dim)`.

- [ ] **Step 4: Scoreboard — zero-sum footer.** Replace border/colors: `borderTop: '1px solid var(--border)'`, `color: 'var(--text-faint)'`, drop `opacity: 0.6`. Inner span: `fontFamily: 'monospace'` → `fontVariantNumeric: 'tabular-nums'`.

- [ ] **Step 5: EventLog — heading and chip styles.** `<h3>` → `<h3 className="section-label" style={{ marginBottom: '0.6rem' }}>Round {roundNumber} Events</h3>`. Replace `getStyle` with:

```tsx
const getStyle = (type: RoundEvent['type']): React.CSSProperties => {
  switch (type) {
    case 'doubling': return { color: 'var(--accent-strong)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' };
    case 'pivot': return { color: 'var(--violet)', background: 'var(--violet-dim)', border: '1px solid var(--violet-border)' };
    case 'removal': return { color: 'var(--color-negative)', background: 'var(--negative-dim)', border: '1px solid rgba(224,102,108,0.4)' };
    case 'resolution': return { color: 'var(--color-positive)', background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.35)' };
  }
};
```

Chip span: `borderRadius: '6px'`, `fontFamily: 'monospace'` → `fontVariantNumeric: 'tabular-nums'`. Empty-state + description text: `var(--cream-dark)` → `var(--text-dim)`, drop `fontStyle: 'italic'`.

- [ ] **Step 6: RoundHistory — apply mapping table throughout:**
- `<h3>` → `<h3 className="section-label" style={{ marginBottom: '0.6rem' }}>Round History</h3>`
- Row button style: `borderRadius: '10px'`, `background: 'var(--surface-2)'`, `border: '1px solid var(--border)'`
- `R{n}` span: `color: 'var(--text-faint)'`, `fontVariantNumeric: 'tabular-nums'` (drop monospace)
- Player names: `var(--cream-dark)` → `var(--text-dim)`; "vs": `var(--gold-dark)` → `var(--text-faint)`
- Winner chip: `borderRadius: '6px'`, remove Cinzel; captain: `background: 'var(--accent-dim)', color: 'var(--accent-strong)', border: '1px solid var(--accent-border)'`; teamB: `background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', border: '1px solid var(--border)'`
- Expand +/− indicator: `color: 'var(--text-faint)'`
- Expanded panel: `borderLeft: '2px solid var(--accent-border)'`, `color: 'var(--text-dim)'`
- "Table After Round" label: replace inline style with `className="section-label"` plus `style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}`
- Standing rows: rank `var(--gold-dark)`→`var(--text-faint)` + tabular-nums; names `var(--cream)`→`var(--text)`; balances monospace→tabular-nums, `var(--cream-dark)`→`var(--text-dim)`

- [ ] **Step 7: Verify + commit**

Run: `npm run build` → passes. Visual check: scoreboard rows, event chips, history rows all in new palette.

```bash
git add src/components/Scoreboard.tsx src/components/EventLog.tsx src/components/RoundHistory.tsx
git commit -m "feat(design): restyle Scoreboard, EventLog, RoundHistory"
```

---

### Task 4: RoundPanel

**Files:**
- Modify: `src/components/RoundPanel.tsx`

- [ ] **Step 1: Replace the `sectionLabel` const usage.** Delete the const; everywhere it was used (`style={sectionLabel}`) use `className="section-label"` instead.

- [ ] **Step 2: Idle state (round complete / not started).** Last-round box:

```tsx
<div
  style={{
    padding: '1rem',
    borderRadius: '12px',
    background: lastRound.winner === 'captain' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${lastRound.winner === 'captain' ? 'var(--accent-border)' : 'var(--border)'}`,
  }}
>
```

Its `<h3>`: remove Cinzel, `color: lastRound.winner === 'captain' ? 'var(--accent-strong)' : 'var(--text)'`, `fontWeight: 700`. Body text `var(--cream-dark)` → `var(--text-dim)`. "Changes" label → `className="section-label"` (keep `marginBottom: '0.25rem'`). Change values keep `--color-positive/negative`; names `var(--cream)` → `var(--text)`.
"Next Captain / Next Rep" line: `var(--cream-dark)`→`var(--text-dim)`, captain name `var(--gold)`→`var(--accent)`, rep name `var(--cream)`→`var(--text)`.

- [ ] **Step 3: Active round header.**

```tsx
<h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
  Round {round.roundNumber}
</h3>
```

Doublings counter: `var(--cream-dark)`→`var(--text-dim)`, count `var(--gold)`→`var(--accent)`, monospace→tabular-nums.

- [ ] **Step 4: Captain vs Representative boxes.**

Captain box:

```tsx
<div
  style={{
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent-strong)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '1.15rem',
    padding: '0.6rem 1rem',
    borderRadius: '12px',
  }}
>
```

Rep box: same shape with `background: 'var(--surface-2)'`, `border: '1px solid var(--border)'`, `color: 'var(--text)'`.
"VS" span: `style={{ fontSize: '1rem', color: 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 700 }}`.

- [ ] **Step 5: Stakes grid cells.**

```tsx
style={{
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '0.5rem',
}}
```

Cell label div: `color: 'var(--text-faint)'` (drop gold-dark). Value div: `fontVariantNumeric: 'tabular-nums'` (drop monospace); colors array becomes `'var(--text)'` (Per Player), `'var(--text-dim)'` (Active B), `'var(--accent)'` (Captain Risk).

- [ ] **Step 6: Team B chips.**

```tsx
style={{
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.9rem',
  fontWeight: isRep ? 600 : 400,
  textDecoration: !isActive ? 'line-through' : 'none',
  color: !isActive ? 'var(--color-removed)' : isRep ? 'var(--text)' : 'var(--text-dim)',
  background: !isActive ? 'transparent' : isRep ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
  border: isRep && isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
}}
```

- [ ] **Step 7: "Next doubling" line.** Label `var(--cream-dark)`→`var(--text-dim)`; value colors: captain `var(--gold)`→`var(--accent)`, teamB `var(--cream)`→`var(--text)`, either keeps `var(--color-positive)`.

- [ ] **Step 8: Pivot / Initial-Double buttons.** All four purple-gradient inline buttons (removal-prompt pivot, only-1-active pivot, standalone pivot, Initial Double) become:

```tsx
<button onClick={handlePivot} className="btn btn-pivot w-full">
  {pivoterLabel} Pivots → {pivotStake}
</button>
```

```tsx
<button onClick={() => dispatch({ type: 'INITIAL_DOUBLE' })} className="btn btn-pivot w-full">
  Initial Double → {round.perPlayerStake * 2}
</button>
```

(remove their `style={{...}}` entirely)

- [ ] **Step 9: Removal prompt / picker / only-1-active boxes.**
- Removal prompt + picker containers: `background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '0.75rem'`; prompt text `var(--gold-light)`→`var(--accent-strong)`.
- Only-1-active container: `background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem'`, text `var(--cream-dark)`→`var(--text-dim)`.
- Picker player buttons:

```tsx
style={{
  borderRadius: '10px',
  border: `1px solid ${selectedForRemoval.has(id) ? 'rgba(224,102,108,0.5)' : 'var(--border)'}`,
  background: selectedForRemoval.has(id) ? 'var(--negative-dim)' : 'var(--surface-2)',
  color: selectedForRemoval.has(id) ? 'var(--color-negative)' : 'var(--text)',
  fontSize: '1rem',
  transition: 'all 0.1s',
}}
```

- [ ] **Step 10: Action area.** Border-top div: `borderTop: '1px solid var(--border)'`.
Win-type picker container: `background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.35)', borderRadius: '12px', padding: '1rem'`; its heading: remove Cinzel (keep `color: 'var(--color-positive)'`); Mars button → `className="btn btn-mars py-5 flex-col"` (no style); Turkish button → `className="btn btn-turkish py-5 flex-col"` (no style).
Winner picker container: same box style as win-type picker; headings: remove Cinzel; subtitle `var(--cream-dark)`→`var(--text-dim)`.

- [ ] **Step 11: Verify + commit**

Run: `npm run build` → passes. Visual: start a round, walk through double → pivot → removal → resolve; every panel in new palette, no unstyled/missing colors.

```bash
git add src/components/RoundPanel.tsx
git commit -m "feat(design): restyle RoundPanel to dark premium"
```

---

### Task 5: SetupScreen

**Files:**
- Modify: `src/components/SetupScreen.tsx`

- [ ] **Step 1: Delete the `BoardPoints` function (lines 17–29) and both usages (incl. their wrapper `<div className="w-full">`s)**

- [ ] **Step 2: Root div** → `className="min-h-full flex flex-col items-center justify-center"` with `style={{ background: 'var(--bg)', padding: 0 }}`.

- [ ] **Step 3: Title block.**

```tsx
<div className="text-center mb-8">
  <h1
    style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 'clamp(2rem, 6vw, 2.75rem)',
      color: 'var(--text)',
      letterSpacing: '-0.01em',
      lineHeight: 1.1,
    }}
  >
    Captain <span style={{ color: 'var(--accent)' }}>Tavla</span>
  </h1>
  <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginTop: '0.5rem' }}>
    Stakes, doublings & balances
  </p>
</div>
```

- [ ] **Step 4: Step headings.** Every step `<h2>` (Players / Choose Captain / Team B Order / Game Mode / Starting Balances) becomes:

```tsx
<h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '1rem' }}>
```

(keep each one's original `marginBottom` where it differs). All helper `<p>`s: `var(--cream-dark)` → `var(--text-dim)` (keep opacities). Captain name highlight in order step: `var(--gold)` → `var(--accent)`.

- [ ] **Step 5: Row numbers & order rows.**
- Name-input row numbers: `color: 'var(--text-faint)'`, monospace → `fontVariantNumeric: 'tabular-nums'`.
- Order rows:

```tsx
style={{
  padding: '0.65rem 0.85rem',
  borderRadius: '10px',
  border: i === 0 ? '1px solid var(--accent-border)' : '1px solid var(--border)',
  background: i === 0 ? 'var(--accent-dim)' : 'var(--surface-2)',
}}
```

- REP/# label: `color: i === 0 ? 'var(--accent)' : 'var(--text-faint)'`, monospace → tabular-nums.
- Row name span: `var(--cream)` → `var(--text)`.
- Remove (✕) button: `color: 'var(--color-removed)'` unchanged (token exists).

- [ ] **Step 6: Balance sum box.**

```tsx
style={{
  marginBottom: '0.75rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '10px',
  background: 'var(--surface-2)',
  border: `1px solid ${isBalanceValid ? 'rgba(87,201,138,0.35)' : 'rgba(224,102,108,0.4)'}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}}
```

Label: `var(--cream-dark)` → `var(--text-dim)`; sum: monospace → tabular-nums. Balance-step player names: `var(--cream)` → `var(--text)`.

- [ ] **Step 7: Verify + commit**

Run: `npm run build` → passes. Visual: walk all 5 setup steps at 380px.

```bash
git add src/components/SetupScreen.tsx
git commit -m "feat(design): restyle SetupScreen"
```

---

### Task 6: GameSummaryScreen

**Files:**
- Modify: `src/components/GameSummaryScreen.tsx`

- [ ] **Step 1: Chart palette + tooltip.**

```tsx
const COLORS = ['#d4b36a', '#57c98a', '#e0666c', '#5fa8e8', '#c9d157', '#a78bfa'];
```

```tsx
const chartTooltipStyle = {
  background: '#1a1e27',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '10px',
  color: '#edf0f5',
  fontSize: '0.8rem',
};
```

Bar fills: `<Bar dataKey="Wins" fill="#57c98a" ... />`, `<Bar dataKey="Losses" fill="#e0666c" ... />` (keep `radius={[2, 2, 0, 0]}`).

- [ ] **Step 2: Top bar** → replace wood-gradient div with:

```tsx
<div className="app-header">
  <h1 className="brand" style={{ flex: 1 }}>
    Tavla <span className="brand-accent">Summary</span>
  </h1>
  <button onClick={onNewGame} className="btn btn-captain px-4 py-1.5 text-sm">
    New Game
  </button>
</div>
```

- [ ] **Step 3: Content area** — scroll container `background: 'var(--wood-dark)'` → `'var(--bg)'`.

- [ ] **Step 4: Card headings.** All three `<h2>`s (Final Standings / Balance Progression / Wins & Losses) become:

```tsx
<h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Final Standings</h2>
```

(same pattern for the other two titles)

- [ ] **Step 5: Standings rows.** Rank span: remove Cinzel, `color: 'var(--text-faint)'`, add `fontVariantNumeric: 'tabular-nums'`. Name: `var(--cream)` → `var(--text)`. Balance: monospace → tabular-nums, `var(--cream-dark)` → `var(--text-dim)`. Row border: `rgba(255,255,255,0.05)` → `var(--border)`.

- [ ] **Step 6: Verify + commit**

Run: `npm run build` → passes. Visual: play 2 quick rounds, End Game, check summary charts/colors.

```bash
git add src/components/GameSummaryScreen.tsx
git commit -m "feat(design): restyle GameSummaryScreen and charts"
```

---

### Task 7: SpectatorScreen + RemovePlayerModal

**Files:**
- Modify: `src/components/SpectatorScreen.tsx`
- Modify: `src/components/RemovePlayerModal.tsx`

- [ ] **Step 1: SpectatorScreen** — replace slate Tailwind text classes with tokens:

```tsx
<div className="min-h-full flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
  <div className="text-center space-y-4">
    <div className="text-6xl">{status === 'waiting' ? '⏳' : '🏁'}</div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.4rem', color: 'var(--text)' }}>
      {status === 'waiting' ? 'Waiting for host...' : 'Game ended'}
    </h2>
    <p style={{ color: 'var(--text-dim)' }}>
      {status === 'waiting'
        ? 'The host has not started the game yet.'
        : 'The host has reset the game.'}
    </p>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Room: {roomCode}</p>
  </div>
</div>
```

- [ ] **Step 2: RemovePlayerModal — overlay + card.** Outer div: replace the whole inline style with `className="modal-overlay"` (keep `onClick={onCancel}`). Inner div: replace inline style with `className="modal-card"` (keep `onClick={e => e.stopPropagation()}`).

- [ ] **Step 3: RemovePlayerModal — content sweep.**
- `<h2>`: `style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '1rem' }}`
- Helper/description `<p>`s: `var(--cream-dark)` → `var(--text-dim)`
- "No player can be removed" box: `background: 'var(--negative-dim)', border: '1px solid rgba(224,102,108,0.4)', borderRadius: '10px'`
- `<label>`: `var(--cream-dark)` → `var(--text-dim)`
- `<select>`: replace inline style with `className="board-input"` plus `style={{ marginBottom: '1rem' }}`
- Player rows: `borderBottom: '1px solid var(--border)'`; balance sub-spans keep opacity
- `−` stepper button: `background: 'var(--negative-dim)', border: '1px solid rgba(224,102,108,0.4)', borderRadius: '8px', color: 'var(--color-negative)'` (keep padding/cursor/fontSize)
- `+` stepper button: `background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.4)', borderRadius: '8px', color: 'var(--color-positive)'`
- Adjustment value span: monospace → tabular-nums; neutral color `var(--cream-dark)` → `var(--text-dim)`
- "Remaining to distribute" box: `background: 'var(--surface-3)', borderRadius: '10px'`; label `var(--cream-dark)` → `var(--text-dim)`; value monospace → tabular-nums

- [ ] **Step 4: Verify + commit**

Run: `npm run build` → passes. Visual: open Remove Player from the menu; open a `?room=XXXX` URL for the spectator waiting state.

```bash
git add src/components/SpectatorScreen.tsx src/components/RemovePlayerModal.tsx
git commit -m "feat(design): restyle SpectatorScreen and RemovePlayerModal"
```

---

### Task 8: Final sweep — legacy references, build, mobile pass

**Files:**
- Possibly touch: any file the greps flag

- [ ] **Step 1: Grep for legacy theme references**

Run:

```bash
grep -rn "Cinzel\|Lora\|--wood\|--gold\|--cream\|--felt\|checker\|BoardPoints\|board-points\|screen-shell" src/
```

Expected: no matches (fix any stragglers using the mapping table — note `App.tsx` doesn't style, but check anyway).

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: passes with no TypeScript or Vite errors.

- [ ] **Step 3: Mobile visual pass (~380px viewport) checklist**
- Setup: all 5 steps readable, REP row highlighted in gold accent
- Game: header, scoreboard, round panel through a full round (double, pivot, removal, mars resolve)
- Undo FAB: appears after first action, disappears when history empty, absent in spectator mode (`?room=` URL)
- Summary: standings + both charts in new palette
- RemovePlayerModal renders as rounded dark modal

- [ ] **Step 4: Commit any sweep fixes**

```bash
git add -A src/
git commit -m "chore(design): final sweep — remove legacy theme references"
```

(skip if no changes)
