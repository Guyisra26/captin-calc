import { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameAction, AppMode } from './types';
import { gameReducer, initialGameState } from './gameReducer';
import { saveGameState, loadGameState } from './storage';
import { writeRoom, subscribeRoom, deleteRoom } from './firebaseSync';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import SpectatorScreen from './components/SpectatorScreen';

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

  if (action.type === 'RESET_GAME') {
    return { current: gameReducer(state.current, action), history: [] };
  }

  const next = gameReducer(state.current, action);
  if (next === state.current) return state;

  return {
    current: next,
    history: [...state.history.slice(-MAX_UNDO), state.current],
  };
}

function getRoomCodeFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

function App() {
  const [{ current: state, history }, dispatch] = useReducer(undoReducer, null, () => {
    const saved = loadGameState();
    return { current: saved ?? initialGameState, history: [] };
  });

  const canUndo = history.length > 0;
  const prevStateRef = useRef(state);

  const urlRoom = getRoomCodeFromURL();
  const [mode, setMode] = useState<AppMode>(() => (urlRoom ? 'spectator' : 'local'));
  const [roomCode, setRoomCode] = useState<string | null>(() => urlRoom);
  const [spectatorState, setSpectatorState] = useState<GameState | null>(null);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      saveGameState(state);
      prevStateRef.current = state;
    }
  }, [state]);

  // Sync to Firebase when hosting
  useEffect(() => {
    if (mode !== 'host' || !roomCode) return;
    writeRoom(roomCode, state);
  }, [mode, roomCode, state]);

  // Subscribe to Firebase when spectating
  useEffect(() => {
    if (mode !== 'spectator' || !roomCode) return;
    const unsub = subscribeRoom(roomCode, (s) => setSpectatorState(s));
    return () => unsub();
  }, [mode, roomCode]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleStartGame = (
    players: { id: string; name: string }[],
    captainId: string,
    teamBOrder: string[],
    initialBalances?: Record<string, number>
  ) => {
    dispatch({ type: 'START_GAME', players, captainId, teamBOrder, initialBalances });
  };

  const handleCreateRoom = useCallback(() => {
    const code = crypto.randomUUID().slice(0, 6).toUpperCase();
    setRoomCode(code);
    setMode('host');
  }, []);

  const handleDispatch = useCallback((action: GameAction) => {
    if (action.type === 'RESET_GAME' && mode === 'host' && roomCode) {
      deleteRoom(roomCode);
      setMode('local');
      setRoomCode(null);
    }
    dispatch(action);
  }, [mode, roomCode, dispatch]);

  // Spectator mode: show remote state
  if (mode === 'spectator') {
    if (!spectatorState || spectatorState.screen === 'setup') {
      return (
        <SpectatorScreen
          roomCode={roomCode!}
          status={spectatorState === null ? 'waiting' : 'ended'}
        />
      );
    }
    return (
      <GameScreen
        state={spectatorState}
        dispatch={handleDispatch}
        onUndo={() => {}}
        canUndo={false}
        mode="spectator"
        roomCode={roomCode}
        onCreateRoom={() => {}}
      />
    );
  }

  // Local / Host modes
  if (state.screen === 'setup') {
    return <SetupScreen onStartGame={handleStartGame} />;
  }

  return (
    <GameScreen
      state={state}
      dispatch={handleDispatch}
      onUndo={handleUndo}
      canUndo={canUndo}
      mode={mode}
      roomCode={roomCode}
      onCreateRoom={handleCreateRoom}
    />
  );
}

export default App;
