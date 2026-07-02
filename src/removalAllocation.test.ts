import { describe, it, expect } from 'vitest';
import { suggestAllocation } from './removalAllocation';
import type { Player } from './types';

function p(id: string, balance: number): Player {
  return { id, name: id, balance };
}

describe('suggestAllocation', () => {
  it('single big opposite: B=+7, remaining [a:+13, c:-20] → {a:0, c:7}', () => {
    const result = suggestAllocation(7, [p('a', 13), p('c', -20)]);
    expect(result['a']).toBe(0);
    expect(result['c']).toBe(7);
  });

  it('split greedy: B=+7, remaining [c:-4, d:-3, a:+14] → c gets 4, d gets 3, a gets 0', () => {
    // Sorted by magnitude: c(-4) first, d(-3) second — both fill exactly
    const result = suggestAllocation(7, [p('c', -4), p('d', -3), p('a', 14)]);
    expect(result['c']).toBe(4);
    expect(result['d']).toBe(3);
    expect(result['a']).toBe(0);
  });

  it('negative B mirrors: B=-5, remaining [a:+3, c:+9, d:-7] → c (largest positive) gets -5', () => {
    // sign = -1; opposite-sign players: a(+3), c(+9); sorted by magnitude: c first
    const result = suggestAllocation(-5, [p('a', 3), p('c', 9), p('d', -7)]);
    expect(result['c']).toBe(-5);
    expect(result['a']).toBe(0);
    expect(result['d']).toBe(0);
  });

  it('B=0 → all zeros', () => {
    const result = suggestAllocation(0, [p('a', 10), p('b', -10)]);
    expect(result['a']).toBe(0);
    expect(result['b']).toBe(0);
  });

  it('sum of allocation always equals B', () => {
    const cases: [number, Player[]][] = [
      [7, [p('a', 13), p('c', -20)]],
      [7, [p('c', -4), p('d', -3), p('a', 14)]],
      [-5, [p('a', 3), p('c', 9), p('d', -7)]],
      [0, [p('a', 10), p('b', -10)]],
    ];
    for (const [B, remaining] of cases) {
      const result = suggestAllocation(B, remaining);
      const total = Object.values(result).reduce((s, v) => s + v, 0);
      expect(total).toBe(B);
    }
  });
});
