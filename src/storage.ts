import type { GameState } from './types';

const STORAGE_KEY = 'captain-calc-state';
const VERSION_KEY = 'captain-calc-version';
const CURRENT_VERSION = '7'; // bump this to clear stale state

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  } catch {
    console.warn('Failed to save game state to localStorage');
  }
}

export function loadGameState(): GameState | null {
  try {
    const ver = localStorage.getItem(VERSION_KEY);
    if (ver !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    console.warn('Failed to load game state from localStorage');
    return null;
  }
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
