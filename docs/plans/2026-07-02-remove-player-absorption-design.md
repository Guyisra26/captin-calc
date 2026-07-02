# Remove Player — Balance Absorption Redesign

**Date:** 2026-07-02

---

## Goal

Change how a removed (leaving) player's balance is settled. Instead of the current
"distribute so the sum cancels out" model (which has an inverted-sign bug and produces
non-zero-sum results), the leaver's balance is **absorbed** by one or more remaining
players, as if they already paid/received the points directly.

Example: `a=13, b=7, c=-20`. Remove `b` (+7). `c` absorbs the +7 → `c: -20 → -13`.
Result: `a=13, c=-13`, total 0. ✓

---

## The Rule

When player X (balance `B`) is removed:

- Each remaining player may take an integer **adjustment** (positive or negative).
- **Sum of adjustments must equal `B` exactly** (this is what keeps the game zero-sum,
  since the remaining players' balances sum to `-B` before adjustment).
- Adjustments are applied as `balance += adjustment`.
- All values stay integers.

## Bug Fix (gameReducer `REMOVE_PLAYER`)

Current validation requires `adjustmentSum + removedBalance === 0` (adjustments *cancel*
the balance), which yields a total of `-2B` after removal — a zero-sum violation the
`validateZeroSum` check then logs. New validation: `adjustmentSum === removedBalance`.
No other reducer behavior changes.

## Default Allocation (RemovePlayerModal)

The modal opens with an editable suggested allocation:

1. Take the remaining players whose balance has the **opposite sign** of `B`
   (zero-sum guarantees their combined magnitude ≥ `|B|`).
2. Sort them by `|balance|` descending.
3. Greedily assign each `min(remaining-to-allocate, |their balance|)` (with the sign
   of `B`) until `B` is fully allocated.

This keeps allocations integer, never flips any absorber's sign, and in the common
single-big-opposite case assigns everything to one player (the user's example: all of
`b`'s +7 goes to `c`).

If `B === 0`, the suggested allocation is all zeros and the modal can be confirmed
immediately.

## Modal UX changes

- Header line: "Distribute X's balance of +7 among remaining players."
- "Remaining to allocate" counter that reaches 0 when the allocation is valid;
  Confirm is disabled otherwise.
- Same +/- steppers per player, with corrected meaning: **+1 = this player absorbs
  one more point of the leaver's balance**.
- Allocation resets to the suggested default when the selected player changes.

## Unchanged

- Mid-round locks: cannot remove the captain or the last active Team B player.
- Minimum 2 players remaining.
- `validateZeroSum` post-check (which will now actually pass).
- Backend/league code — this is a purely local-game (frontend) change.

## Testing

- Reducer: valid absorption applies adjustments and preserves zero-sum; wrong-sum
  adjustments are rejected (state unchanged); `B === 0` with all-zero adjustments works.
- Default-allocation helper: single opposite player takes all; multiple opposite
  players split greedily by magnitude; `B = 0` → all zeros; negative `B` mirrors
  positive case.
