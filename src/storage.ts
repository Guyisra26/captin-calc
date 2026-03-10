import type { GameState } from './types';

const STORAGE_KEY = 'captain-calc-state';

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save game state to localStorage');
  }
}

export function loadGameState(): GameState | null {
  try {
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
