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
    nextDoublingProposer: 'teamB', // Team B proposes first doubling
    lastDoublingByTeamB: false,
    canRemove: false,
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
        balance: 0,
      }));
      const newState: GameState = {
        players,
        captainId: action.captainId,
        teamBOrder: action.teamBOrder,
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
      const round = createRound(state, roundNumber);
      return { ...state, currentRound: round };
    }

    case 'DOUBLE': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;

      // Validate: the proposer must match nextDoublingProposer
      if (action.proposer !== round.nextDoublingProposer) return state;

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
        },
      };
    }

    case 'RESOLVE_ROUND': {
      const round = state.currentRound;
      if (!round || round.isComplete) return state;
      if (round.activeBPlayerIds.length === 0) return state;

      const stake = round.perPlayerStake;
      const activeCount = round.activeBPlayerIds.length;
      const captainWins = action.winner === 'captain';

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

      const resolutionEvent = {
        type: 'resolution' as const,
        timestamp: Date.now(),
        description: `${winnerLabel} wins! Stake: ${stake} × ${activeCount} active players`,
      };

      const roundSummary: RoundSummary = {
        roundNumber: round.roundNumber,
        captainId: round.captainId,
        captainName: getPlayerName(state.players, round.captainId),
        representativeId: round.representativeId,
        representativeName: getPlayerName(state.players, round.representativeId),
        winner: action.winner,
        finalPerPlayerStake: stake,
        doublings: round.doublingCount,
        removals: round.removedBPlayerIds.map(id => getPlayerName(state.players, id)),
        balanceChanges,
        events: [...round.events, resolutionEvent],
      };

      // Captain rotation
      let newCaptainId: string;
      let newTeamBOrder: string[];

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
        currentRound: completedRound,
        roundHistory: [...state.roundHistory, roundSummary],
      };
    }

    case 'RESET_GAME': {
      return initialGameState;
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}

export const initialGameState: GameState = {
  players: [],
  captainId: '',
  teamBOrder: [],
  currentRound: null,
  roundHistory: [],
  screen: 'setup',
};
