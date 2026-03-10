import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameAction } from './types';
import { gameReducer, initialGameState } from './gameReducer';
import { saveGameState, loadGameState } from './storage';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';

const MAX_UNDO = 50;

interface UndoState {
  current: GameState;
  history: GameState[];
}

function undoReducer(
  state: UndoState,
  action: GameAction | { type: 'UNDO' }
): UndoState {
  if (action.type === 'UNDO') {
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1];
    return {
      current: prev,
      history: state.history.slice(0, -1),
    };
  }

  // For RESET_GAME / LOAD_STATE, don't push to undo stack
  if (action.type === 'RESET_GAME' || action.type === 'LOAD_STATE') {
    const next = gameReducer(state.current, action);
    return { current: next, history: [] };
  }

  const next = gameReducer(state.current, action);
  if (next === state.current) return state; // No change

  return {
    current: next,
    history: [...state.history.slice(-MAX_UNDO), state.current],
  };
}

function App() {
  const [{ current: state, history }, dispatch] = useReducer(undoReducer, null, () => {
    const saved = loadGameState();
    return { current: saved ?? initialGameState, history: [] };
  });

  const canUndo = history.length > 0;
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      saveGameState(state);
      prevStateRef.current = state;
    }
  }, [state]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleStartGame = (
    players: { id: string; name: string }[],
    captainId: string,
    teamBOrder: string[]
  ) => {
    dispatch({ type: 'START_GAME', players, captainId, teamBOrder });
  };

  if (state.screen === 'setup') {
    return <SetupScreen onStartGame={handleStartGame} />;
  }

  return (
    <GameScreen
      state={state}
      dispatch={dispatch}
      onUndo={handleUndo}
      canUndo={canUndo}
    />
  );
}

export default App;
