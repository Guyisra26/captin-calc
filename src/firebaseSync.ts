import { ref, set, onValue, remove } from 'firebase/database';
import { db } from './firebase';
import type { GameState } from './types';

export function writeRoom(roomCode: string, state: GameState): void {
  set(ref(db, `rooms/${roomCode}/state`), state);
}

export function subscribeRoom(
  roomCode: string,
  callback: (state: GameState | null) => void
): () => void {
  const r = ref(db, `rooms/${roomCode}/state`);
  return onValue(r, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as GameState) : null);
  });
}

export function deleteRoom(roomCode: string): void {
  remove(ref(db, `rooms/${roomCode}`));
}
