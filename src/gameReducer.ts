import type { GameState, GameAction, RoundState, RoundSummary, Player } from './types';

function getPlayerName(players: Player[], id: string): string {
  return players.find(p => p.id === id)?.name ?? 'Unknown';
}

function createRound(
  state: GameState,
  roundNumber: number,
): RoundState {
  const teamBOrder = state.teamBOrder;
  const representativeId = teamBOrder[0];

  return {
    roundNumber,
    captainId: state.captainId,
    representativeId,
    teamBOrder: [...teamBOrder],
    activeBPlayerIds: [...teamBOrder],
    removedBPlayerIds: [],
    perPlayerStake: 1,
    doublingCount: 0,
    nextDoublingProposer: 'either', // Either side can propose first doubling
    lastDoublingByTeamB: false,
    canRemove: false,
    canPivot: false,
    events: [],
    isComplete: false,
  };
}

function validateZeroSum(players: Player[]): void {
  const sum = players.reduce((acc, p) => acc + p.balance, 0);
  if (Math.abs(sum) > 0.001) {
    console.error(`Zero-sum violation! Sum = ${sum}`, players.map(p => ({ name: p.name, balance: p.balance })));
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const players: Player[] = action.players.map(p => ({
        id: p.id,
        name: p.name,
        balance: action.initialBalances?.[p.id] ?? 0,
      }));
      const newState: GameState = {
        players,
        captainId: action.captainId,
        teamBOrder: action.teamBOrder,
        lateJoiners: [],
        currentRound: null,
        roundHistory: [],
        screen: 'game',
      };
      return newState;
    }

    case 'START_ROUND': {
      if (state.currentRound && !state.currentRound.isComplete) {
        return state; // Can't start new round while one is active
      }
      const roundNumber = (state.currentRound?.roundNumber ?? 0) + 1;
      const startBalances: Record<string, number> = {};
      for (const p of state.players) startBalances[p.id] = p.balance;
      const round = { ...createRound(state, roundNumber), startBalances };
      return { ...state, currentRound: round };
    }

    case 'DOUBLE': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;

      // Validate: proposer must match nextDoublingProposer (or 'either' allows both)
      if (round.nextDoublingProposer !== 'either' && action.proposer !== round.nextDoublingProposer) return state;

      // Must have at least 1 active Team B player
      if (round.activeBPlayerIds.length === 0) return state;

      const newStake = round.perPlayerStake * 2;
      const isTeamBProposal = action.proposer === 'teamB';
      const captainName = getPlayerName(state.players, round.captainId);

      const event = {
        type: 'doubling' as const,
        timestamp: Date.now(),
        description: isTeamBProposal
          ? `Team B doubles → stake per player: ${newStake}`
          : `Captain (${captainName}) doubles → stake per player: ${newStake}`,
      };

      return {
        ...state,
        currentRound: {
          ...round,
          perPlayerStake: newStake,
          doublingCount: round.doublingCount + 1,
          nextDoublingProposer: isTeamBProposal ? 'captain' : 'teamB',
          lastDoublingByTeamB: isTeamBProposal,
          canRemove: isTeamBProposal, // Captain can remove only after accepting Team B's doubling
          canPivot: true, // Opposing side may pivot
          events: [...round.events, event],
        },
      };
    }

    case 'INITIAL_DOUBLE': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;

      // Only allowed at round start (no events yet)
      if (round.events.length > 0) return state;

      const newStake = round.perPlayerStake * 2;
      const event = {
        type: 'doubling' as const,
        timestamp: Date.now(),
        description: `Initial double → stake per player: ${newStake}`,
      };

      return {
        ...state,
        currentRound: {
          ...round,
          perPlayerStake: newStake,
          doublingCount: round.doublingCount + 1,
          nextDoublingProposer: 'either', // stays either — no side claimed it
          canRemove: false,
          canPivot: false,
          events: [...round.events, event],
        },
      };
    }

    case 'PIVOT': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;
      if (!round.canPivot) return state;
      if (round.nextDoublingProposer === 'either') return state;
      if (action.pivoter !== round.nextDoublingProposer) return state;

      const newStake = round.perPlayerStake * 2;
      const isPivoterTeamB = action.pivoter === 'teamB';
      const captainName = getPlayerName(state.players, round.captainId);
      const pivoterLabel = isPivoterTeamB ? 'Team B' : `Captain (${captainName})`;

      const event = {
        type: 'pivot' as const,
        timestamp: Date.now(),
        description: `${pivoterLabel} pivots → stake per player: ${newStake}`,
      };

      return {
        ...state,
        currentRound: {
          ...round,
          perPlayerStake: newStake,
          doublingCount: round.doublingCount + 1,
          nextDoublingProposer: action.pivoter, // pivoter keeps the right
          lastDoublingByTeamB: isPivoterTeamB,
          canRemove: isPivoterTeamB, // same rule: Team B's last action enables removal
          canPivot: false, // no chaining pivots
          events: [...round.events, event],
        },
      };
    }

    case 'REMOVE_PLAYERS': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;

      // Can only remove when canRemove is true (after Team B doubled and Captain accepted)
      if (!round.canRemove) return state;

      const toRemove = action.playerIds.filter(id => round.activeBPlayerIds.includes(id));
      if (toRemove.length === 0) return state;

      // Must leave at least 1 active Team B player
      const remainingActive = round.activeBPlayerIds.filter(id => !toRemove.includes(id));
      if (remainingActive.length === 0) return state;

      // The removal settles at the PREVIOUS stake (before the doubling that triggered this)
      // Actually per the rules: removed player wins the amount they are currently risking
      // "at that moment" — which is the per-player stake BEFORE the doubling takes effect
      // Wait — re-reading the rules:
      // "When Team B proposes a doubling and the Captain ACCEPTS, the Captain may remove..."
      // "A removed player immediately receives (wins) the amount they are currently risking at that moment"
      // The doubling has already been accepted, so the new stake is in effect.
      // But the example says: "If the round reached per-player stake=4, Team B proposes doubling (to 8)
      // and Captain accepts and removes Adir: Adir immediately wins 4 (the stake he was risking before removal)"
      // So the removal settles at the OLD stake (before the Team B doubling).
      const removalStake = round.perPlayerStake / 2; // The stake BEFORE the doubling

      // Apply balance changes: removed players win removalStake, Captain loses it
      const players = state.players.map(p => {
        if (toRemove.includes(p.id)) {
          return { ...p, balance: p.balance + removalStake };
        }
        if (p.id === round.captainId) {
          return { ...p, balance: p.balance - removalStake * toRemove.length };
        }
        return p;
      });

      validateZeroSum(players);

      const removedNames = toRemove.map(id => getPlayerName(state.players, id)).join(', ');
      const event = {
        type: 'removal' as const,
        timestamp: Date.now(),
        description: `Captain removes ${removedNames} (settled at ${removalStake} each)`,
      };

      return {
        ...state,
        players,
        currentRound: {
          ...round,
          activeBPlayerIds: remainingActive,
          removedBPlayerIds: [...round.removedBPlayerIds, ...toRemove],
          canRemove: false, // Removal opportunity consumed
          canPivot: false,
          events: [...round.events, event],
        },
      };
    }

    case 'SKIP_REMOVAL': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;
      if (!round.canRemove) return state;

      return {
        ...state,
        currentRound: {
          ...round,
          canRemove: false,
          canPivot: false,
        },
      };
    }

    case 'RESOLVE_ROUND': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;
      if (round.activeBPlayerIds.length === 0) return state;

      const baseStake = round.perPlayerStake;
      const activeCount = round.activeBPlayerIds.length;
      const captainWins = action.winner === 'captain';

      // Mars multiplier: normal=×1, mars=×2, turkish=×3
      const multiplier = action.winType === 'turkish' ? 3 : action.winType === 'mars' ? 2 : 1;
      const stake = baseStake * multiplier;

      // Calculate balance changes
      const balanceChanges: Record<string, number> = {};

      // Active Team B players
      for (const pid of round.activeBPlayerIds) {
        const change = captainWins ? -stake : stake;
        balanceChanges[pid] = change;
      }

      // Captain
      const captainChange = captainWins
        ? stake * activeCount
        : -stake * activeCount;
      balanceChanges[round.captainId] = captainChange;

      // Apply changes
      const players = state.players.map(p => {
        if (balanceChanges[p.id] !== undefined) {
          return { ...p, balance: p.balance + balanceChanges[p.id] };
        }
        return p;
      });

      validateZeroSum(players);

      const winnerLabel = captainWins
        ? `Captain (${getPlayerName(state.players, round.captainId)})`
        : `Team B / ${getPlayerName(state.players, round.representativeId)}`;

      const marsLabel = action.winType === 'turkish' ? ' (Turkish Mars ×3)' : action.winType === 'mars' ? ' (Mars ×2)' : '';

      const resolutionEvent = {
        type: 'resolution' as const,
        timestamp: Date.now(),
        description: `${winnerLabel} wins${marsLabel}! Stake: ${stake} × ${activeCount} active players`,
      };

      const roundSummary: RoundSummary = {
        roundNumber: round.roundNumber,
        captainId: round.captainId,
        captainName: getPlayerName(state.players, round.captainId),
        representativeId: round.representativeId,
        representativeName: getPlayerName(state.players, round.representativeId),
        winner: action.winner,
        winType: action.winType,
        finalPerPlayerStake: stake,
        doublings: round.doublingCount,
        removals: round.removedBPlayerIds.map(id => getPlayerName(state.players, id)),
        balanceChanges,
        events: [...round.events, resolutionEvent],
      };

      // Captain rotation
      let newCaptainId: string;
      let newTeamBOrder: string[];

      const lateSet = new Set(state.lateJoiners);

      if (captainWins) {
        // Captain stays. Next representative = next in Team B order
        newCaptainId = round.captainId;
        // Rotate team B order: move current representative to the end
        const currentOrder = state.teamBOrder;
        const repIndex = currentOrder.indexOf(round.representativeId);
        if (repIndex >= 0) {
          newTeamBOrder = [
            ...currentOrder.slice(repIndex + 1),
            ...currentOrder.slice(0, repIndex + 1),
          ];
        } else {
          newTeamBOrder = [...currentOrder];
        }
      } else {
        // Representative becomes Captain. Old Captain joins Team B at the end
        newCaptainId = round.representativeId;
        const oldCaptainId = round.captainId;
        newTeamBOrder = state.teamBOrder.filter(id => id !== round.representativeId);
        newTeamBOrder.push(oldCaptainId);
      }

      // Position late joiners at the end for their first round, then clear them
      // so they rotate normally from the next round onward (prevents starvation)
      if (lateSet.size > 0) {
        const regular = newTeamBOrder.filter(id => !lateSet.has(id));
        const late = newTeamBOrder.filter(id => lateSet.has(id));
        newTeamBOrder = [...regular, ...late];
      }

      const completedRound = {
        ...round,
        isComplete: true,
        events: [...round.events, resolutionEvent],
      };

      return {
        ...state,
        players,
        captainId: newCaptainId,
        teamBOrder: newTeamBOrder,
        lateJoiners: [], // clear so late joiners rotate normally from now on
        currentRound: completedRound,
        roundHistory: [...state.roundHistory, roundSummary],
      };
    }

    case 'ADD_PLAYER': {
      const id = crypto.randomUUID();
      const newPlayer: Player = { id, name: action.name, balance: 0 };
      return {
        ...state,
        players: [...state.players, newPlayer],
        teamBOrder: [...state.teamBOrder, id],
        lateJoiners: [...state.lateJoiners, id],
        // currentRound is NOT modified — player joins next round
      };
    }

    case 'REMOVE_PLAYER': {
      // Only allowed between rounds
      if (state.currentRound && !state.currentRound.isComplete) return state;

      const { playerId, balanceAdjustments } = action;
      const removedPlayer = state.players.find(p => p.id === playerId);
      if (!removedPlayer) return state;

      // Validate zero-sum: adjustments must exactly cancel removed player's balance
      const adjustmentSum = Object.values(balanceAdjustments).reduce((a, b) => a + b, 0);
      if (Math.abs(adjustmentSum + removedPlayer.balance) > 0.001) return state;

      const newPlayers = state.players
        .filter(p => p.id !== playerId)
        .map(p => ({
          ...p,
          balance: p.balance + (balanceAdjustments[p.id] ?? 0),
        }));

      validateZeroSum(newPlayers);

      const newTeamBOrder = state.teamBOrder.filter(id => id !== playerId);
      // If removed player was captain, promote first in rotation order
      const newCaptainId =
        state.captainId === playerId ? (newTeamBOrder[0] ?? '') : state.captainId;

      return {
        ...state,
        players: newPlayers,
        teamBOrder: newTeamBOrder,
        captainId: newCaptainId,
        lateJoiners: state.lateJoiners.filter(id => id !== playerId),
      };
    }

    case 'RESET_GAME': {
      return initialGameState;
    }

    default:
      return state;
  }
}

export const initialGameState: GameState = {
  players: [],
  captainId: '',
  teamBOrder: [],
  lateJoiners: [],
  currentRound: null,
  roundHistory: [],
  screen: 'setup',
};
