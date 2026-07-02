import type { Player } from './types';

/**
 * Suggest how remaining players absorb a removed player's balance.
 * Greedy: players whose balance has the opposite sign of `removedBalance`,
 * largest magnitude first, each absorbing up to their own magnitude.
 * Zero-sum guarantees the opposite side can absorb all of it.
 * Returns integer adjustments summing exactly to `removedBalance`.
 */
export function suggestAllocation(
  removedBalance: number,
  remaining: Player[]
): Record<string, number> {
  const allocation: Record<string, number> = {};
  for (const p of remaining) allocation[p.id] = 0;
  if (removedBalance === 0) return allocation;

  const sign = removedBalance > 0 ? 1 : -1;
  // Opposite-sign players, largest |balance| first
  const absorbers = remaining
    .filter(p => sign * p.balance < 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  let left = Math.abs(removedBalance);
  for (const p of absorbers) {
    if (left === 0) break;
    const take = Math.min(left, Math.abs(p.balance));
    allocation[p.id] = sign * take;
    left -= take;
  }
  // Fallback (shouldn't happen in a zero-sum game): dump remainder on first player
  if (left > 0 && remaining.length > 0) {
    allocation[remaining[0].id] += sign * left;
  }
  return allocation;
}
