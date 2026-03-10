export interface Player {
  id: string;
  name: string;
  balance: number;
}

export type DoublingProposer = 'captain' | 'teamB' | 'either';

export interface RoundEvent {
  type: 'doubling' | 'pivot' | 'removal' | 'resolution';
  timestamp: number;
  description: string;
}

export interface RoundState {
  roundNumber: number;
  captainId: string;
  representativeId: string;
  teamBOrder: string[]; // all Team B player IDs in order (including removed)
  activeBPlayerIds: string[]; // currently active Team B players
  removedBPlayerIds: string[]; // removed/settled players
  perPlayerStake: number;
  doublingCount: number;
  nextDoublingProposer: DoublingProposer; // who can propose the NEXT doubling
  lastDoublingByTeamB: boolean; // was the last doubling proposed by Team B? (enables removal)
  canRemove: boolean; // Captain can remove players right now
  canPivot: boolean; // Opposing side can pivot (accept + counter-double)
  events: RoundEvent[];
  isComplete: boolean;
}

export interface RoundSummary {
  roundNumber: number;
  captainId: string;
  captainName: string;
  representativeId: string;
  representativeName: string;
  winner: 'captain' | 'teamB';
  winType: 'normal' | 'mars' | 'turkish';
  finalPerPlayerStake: number;
  doublings: number;
  removals: string[]; // removed player names
  balanceChanges: Record<string, number>; // playerId -> change
  events: RoundEvent[];
}

export interface GameState {
  players: Player[];
  captainId: string;
  teamBOrder: string[]; // player IDs in Team B order
  lateJoiners: string[]; // players added mid-game (always last in rotation)
  currentRound: RoundState | null;
  roundHistory: RoundSummary[];
  screen: 'setup' | 'game';
}

// Actions
export type GameAction =
  | { type: 'START_GAME'; players: { id: string; name: string }[]; captainId: string; teamBOrder: string[]; initialBalances?: Record<string, number> }
  | { type: 'START_ROUND' }
  | { type: 'DOUBLE'; proposer: DoublingProposer }
  | { type: 'INITIAL_DOUBLE' }
  | { type: 'REMOVE_PLAYERS'; playerIds: string[] }
  | { type: 'SKIP_REMOVAL' }
  | { type: 'PIVOT'; pivoter: 'captain' | 'teamB' }
  | { type: 'RESOLVE_ROUND'; winner: 'captain' | 'teamB'; winType: 'normal' | 'mars' | 'turkish' }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'RESET_GAME' };

export type AppMode = 'local' | 'host' | 'spectator';
