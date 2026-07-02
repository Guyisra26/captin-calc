import { describe, it, expect } from 'vitest';
import { gameReducer } from './gameReducer';
import type { GameState } from './types';

function makeState(players: { id: string; name: string; balance: number }[], captainId: string, teamBOrder: string[]): GameState {
  return {
    players,
    captainId,
    teamBOrder,
    lateJoiners: [],
    currentRound: null,
    roundHistory: [],
    screen: 'game',
  };
}

describe('REMOVE_PLAYER', () => {
  const baseState = makeState(
    [
      { id: 'a', name: 'Alice', balance: 13 },
      { id: 'b', name: 'Bob', balance: 7 },
      { id: 'c', name: 'Carol', balance: -20 },
    ],
    'a',
    ['b', 'c'],
  );

  it('happy path: removes b, c absorbs +7 → c becomes -13, total sum 0', () => {
    const action = {
      type: 'REMOVE_PLAYER' as const,
      playerId: 'b',
      balanceAdjustments: { c: 7 },
    };
    const next = gameReducer(baseState, action);
    const byId = Object.fromEntries(next.players.map(p => [p.id, p.balance]));

    expect(next.players.find(p => p.id === 'b')).toBeUndefined();
    expect(byId['a']).toBe(13);
    expect(byId['c']).toBe(-13);
    const total = next.players.reduce((s, p) => s + p.balance, 0);
    expect(total).toBe(0);
  });

  it('wrong-sum rejected: adjustments {c: -7} must not change state', () => {
    const action = {
      type: 'REMOVE_PLAYER' as const,
      playerId: 'b',
      balanceAdjustments: { c: -7 },
    };
    const next = gameReducer(baseState, action);
    expect(next).toBe(baseState);
  });

  it('zero-balance removal: b has balance 0, all-zero adjustments → succeeds, sum stays 0', () => {
    const zeroState = makeState(
      [
        { id: 'a', name: 'Alice', balance: 5 },
        { id: 'b', name: 'Bob', balance: 0 },
        { id: 'c', name: 'Carol', balance: -5 },
      ],
      'a',
      ['b', 'c'],
    );
    const action = {
      type: 'REMOVE_PLAYER' as const,
      playerId: 'b',
      balanceAdjustments: { a: 0, c: 0 },
    };
    const next = gameReducer(zeroState, action);
    expect(next.players.find(p => p.id === 'b')).toBeUndefined();
    const total = next.players.reduce((s, p) => s + p.balance, 0);
    expect(total).toBe(0);
  });
});
