import { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameAction, AppMode } from './types';
import { gameReducer, initialGameState } from './gameReducer';
import { saveGameState, loadGameState } from './storage';
import { writeRoom, subscribeRoom, deleteRoom } from './firebaseSync';
import { logGameStart, logRoomCode, logRoundComplete, logGameEnded } from './firebaseLog';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import SpectatorScreen from './components/SpectatorScreen';
import LoginScreen from './components/LoginScreen';
import { isLoggedIn, clearAuth } from './auth';

const MAX_UNDO = 50;
const LS_ROOM_CODE = 'captainCalc_roomCode';
const LS_HOST_MODE = 'captainCalc_hostMode';

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
  const gameIdRef = useRef<string | null>(null);
  const prevScreenRef = useRef(state.screen);
  const roomCodeLoggedRef = useRef<string | null>(null);

  const urlRoom = getRoomCodeFromURL();
  const [mode, setMode] = useState<AppMode>(() => {
    if (urlRoom) return 'spectator';
    const savedCode = localStorage.getItem(LS_ROOM_CODE);
    if (savedCode && localStorage.getItem(LS_HOST_MODE) === 'host') return 'host';
    return 'local';
  });
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    if (urlRoom) return urlRoom;
    return localStorage.getItem(LS_ROOM_CODE);
  });
  const [spectatorState, setSpectatorState] = useState<GameState | null>(null);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      saveGameState(state);
      prevStateRef.current = state;
    }
  }, [state]);

  // Persist host room code to localStorage
  useEffect(() => {
    if (mode === 'host' && roomCode) {
      localStorage.setItem(LS_ROOM_CODE, roomCode);
      localStorage.setItem(LS_HOST_MODE, 'host');
    } else if (mode === 'local') {
      localStorage.removeItem(LS_ROOM_CODE);
      localStorage.removeItem(LS_HOST_MODE);
    }
  }, [mode, roomCode]);

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

  // Log game start to Firebase
  useEffect(() => {
    if (prevScreenRef.current === 'setup' && state.screen === 'game') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      gameIdRef.current = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => chars[b % chars.length])
        .join('');
      logGameStart(gameIdRef.current, state.players, roomCode);
    }
    prevScreenRef.current = state.screen;
  }, [state.screen, state.players, roomCode]);

  // Log each completed round
  const prevRoundCountRef = useRef(0);
  useEffect(() => {
    const count = state.roundHistory.length;
    if (count > prevRoundCountRef.current && gameIdRef.current) {
      const latest = state.roundHistory[count - 1];
      logRoundComplete(gameIdRef.current, latest);
    }
    prevRoundCountRef.current = count;
  }, [state.roundHistory]);

  // Log room code once per game when host room is created
  useEffect(() => {
    if (
      roomCode &&
      gameIdRef.current &&
      state.screen === 'game' &&
      roomCodeLoggedRef.current !== gameIdRef.current
    ) {
      roomCodeLoggedRef.current = gameIdRef.current;
      logRoomCode(gameIdRef.current, roomCode);
    }
  }, [roomCode, state.screen]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const [playerMongoIds, setPlayerMongoIds] = useState<Record<string, string>>({});

  const handleStartGame = (
    players: { id: string; name: string }[],
    captainId: string,
    teamBOrder: string[],
    initialBalances?: Record<string, number>,
    mongoIdMap?: Record<string, string>
  ) => {
    if (mongoIdMap) setPlayerMongoIds(mongoIdMap);
    dispatch({ type: 'START_GAME', players, captainId, teamBOrder, initialBalances });
  };

  const handleCreateRoom = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => chars[b % chars.length])
      .join('');
    setRoomCode(code);
    setMode('host');
  }, []);

  const handleDispatch = useCallback((action: GameAction) => {
    if (action.type === 'RESET_GAME' && mode === 'host' && roomCode) {
      deleteRoom(roomCode);
      setMode('local');
      setRoomCode(null);
    }
    if (action.type === 'RESET_GAME' && gameIdRef.current) {
      logGameEnded(gameIdRef.current);
      gameIdRef.current = null;
      roomCodeLoggedRef.current = null;
    }
    if (action.type === 'RESET_GAME') {
      clearAuth();
      setLoggedIn(false);
    }
    dispatch(action);
  }, [mode, roomCode, dispatch]);

  if (!loggedIn && mode !== 'spectator') {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

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
