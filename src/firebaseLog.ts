import type { Player, RoundSummary } from './types';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;

function patch(path: string, data: object): void {
  if (!DB_URL) return;
  fetch(`${DB_URL}${path}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => { if (!res.ok) console.error(`Firebase log error: ${res.status} ${res.statusText}`); })
    .catch(err => console.error('Firebase log error:', err));
}

function put(path: string, data: object): void {
  if (!DB_URL) return;
  fetch(`${DB_URL}${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => { if (!res.ok) console.error(`Firebase log error: ${res.status} ${res.statusText}`); })
    .catch(err => console.error('Firebase log error:', err));
}

export function logGameStart(
  gameId: string,
  players: Player[],
  roomCode: string | null
): void {
  put(`/logs/${gameId}`, {
    gameId,
    roomCode: roomCode ?? null,
    createdAt: Date.now(),
    status: 'active',
    endedAt: null,
    players: players.map(p => ({ id: p.id, name: p.name })),
  });
}

export function logRoomCode(gameId: string, roomCode: string): void {
  patch(`/logs/${gameId}`, { roomCode });
}

export function logRoundComplete(gameId: string, round: RoundSummary): void {
  put(`/logs/${gameId}/rounds/${round.roundNumber}`, {
    roundNumber: round.roundNumber,
    captainName: round.captainName,
    representativeName: round.representativeName,
    winner: round.winner,
    winType: round.winType,
    doublings: round.doublings,
    removals: round.removals,
    finalPerPlayerStake: round.finalPerPlayerStake,
    balanceChanges: round.balanceChanges,
    completedAt: Date.now(),
  });
}

export function logGameEnded(gameId: string): void {
  patch(`/logs/${gameId}`, {
    status: 'ended',
    endedAt: Date.now(),
  });
}
