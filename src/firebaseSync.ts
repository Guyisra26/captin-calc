import type { GameState } from './types';
import { getIdToken } from './authGate';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string;
const POLL_INTERVAL_MS = 2000;

export async function authedFetch(url: string, opts?: RequestInit): Promise<Response> {
  const token = await getIdToken();
  const sep = url.includes('?') ? '&' : '?';
  const finalUrl = token ? `${url}${sep}auth=${token}` : url;
  return fetch(finalUrl, opts);
}

export function writeRoom(roomCode: string, state: GameState): void {
  if (!DB_URL) return;
  // Double-encode as string so Firebase doesn't convert arrays to indexed objects
  authedFetch(`${DB_URL}/rooms/${roomCode}/state.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(state)),
  }).catch(err => console.error('Firebase write error:', err));
}

export function subscribeRoom(
  roomCode: string,
  callback: (state: GameState | null) => void
): () => void {
  if (!DB_URL) {
    callback(null);
    return () => {};
  }

  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const res = await authedFetch(`${DB_URL}/rooms/${roomCode}/state.json`);
      if (!res.ok) {
        console.error('Firebase REST error:', res.status, res.statusText);
      } else {
        const raw = await res.json();
        // raw is a JSON string (double-encoded) or null
        callback(raw ? JSON.parse(raw as string) as GameState : null);
      }
    } catch (error) {
      console.error('Firebase poll error:', error);
    }
    if (!stopped) setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();

  return () => { stopped = true; };
}

export function deleteRoom(roomCode: string): void {
  if (!DB_URL) return;
  authedFetch(`${DB_URL}/rooms/${roomCode}.json`, {
    method: 'DELETE',
  }).catch(err => console.error('Firebase delete error:', err));
}
