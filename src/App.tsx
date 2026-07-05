import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import type { GameState, GameAction, AppMode } from './types';
import { gameReducer, initialGameState } from './gameReducer';
import { saveGameState, loadGameState } from './storage';
import { writeRoom, subscribeRoom, deleteRoom } from './firebaseSync';
import { createHandoff, cancelHandoff, readHost, writeHost } from './hostTransfer';
import { subscribeAuth, signInWithGoogle, signOutUser, isAllowed, type User } from './authGate';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameSummaryScreen from './components/GameSummaryScreen';
import SpectatorScreen from './components/SpectatorScreen';
import AuthGate from './components/AuthGate';

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

function AppInner() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return subscribeAuth(u => { setAuthUser(u); setAuthReady(true); });
  }, []);

  const [{ current: state, history }, dispatch] = useReducer(undoReducer, null, () => {
    const saved = loadGameState();
    return { current: saved ?? initialGameState, history: [] };
  });

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
  const [view, setView] = useState<'game' | 'summary'>('game');

  const canUndo = history.length > 0;
  const prevStateRef = useRef(state);

  const myUid = authUser?.uid ?? null;
  const [transferPending, setTransferPending] = useState(false);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      saveGameState(state);
      prevStateRef.current = state;
    }
  }, [state]);

  useEffect(() => {
    if (mode === 'host' && roomCode) {
      localStorage.setItem(LS_ROOM_CODE, roomCode);
      localStorage.setItem(LS_HOST_MODE, 'host');
    } else if (mode === 'local') {
      localStorage.removeItem(LS_ROOM_CODE);
      localStorage.removeItem(LS_HOST_MODE);
    }
  }, [mode, roomCode]);

  useEffect(() => {
    if (mode !== 'host' || !roomCode) return;
    writeRoom(roomCode, state);
  }, [mode, roomCode, state]);

  useEffect(() => {
    if (mode !== 'spectator' || !roomCode) return;
    const unsub = subscribeRoom(roomCode, s => setSpectatorState(s));
    return () => unsub();
  }, [mode, roomCode]);

  useEffect(() => {
    if (mode !== 'host' || !roomCode || !myUid) return;
    readHost(roomCode).then(h => {
      if (!h) writeHost(roomCode, { uid: myUid, epoch: 1 });
    });
  }, [mode, roomCode, myUid]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleDispatch = useCallback((action: GameAction) => {
    dispatch(action);
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => chars[b % chars.length])
      .join('');
    setRoomCode(code);
    setMode('host');
    if (myUid) writeHost(code, { uid: myUid, epoch: 1 });
  }, [myUid]);

  const handleStopSharing = useCallback(() => {
    if (roomCode) deleteRoom(roomCode);
    setMode('local');
    setRoomCode(null);
  }, [roomCode]);

  const handleTransferHost = useCallback(async () => {
    if (!roomCode) return;
    const token = await createHandoff(roomCode);
    setTransferPending(true);
    const url = `${window.location.origin}/?room=${roomCode}&claim=${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Captain Tavla', text: 'Take over hosting of our game', url });
      } catch {
        // share sheet cancelled — token stays valid, link is still shareable later
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Transfer link copied');
      } catch {
        alert(url);
      }
    }
  }, [roomCode]);

  const handleCancelTransfer = useCallback(async () => {
    if (!roomCode) return;
    await cancelHandoff(roomCode);
    setTransferPending(false);
  }, [roomCode]);

  // Spectator links (?room=...) are public read-only — skip the auth gate for them.
  // Everything else (hosting / playing) stays behind Google sign-in + allowlist.
  if (!urlRoom) {
    if (!authReady) return <AuthGate mode="loading" onSignIn={signInWithGoogle} onSignOut={signOutUser} />;
    if (!authUser) return <AuthGate mode="signin" onSignIn={signInWithGoogle} onSignOut={signOutUser} />;
    if (!isAllowed(authUser)) return <AuthGate mode="denied" email={authUser.email} onSignIn={signInWithGoogle} onSignOut={signOutUser} />;
  }

  if (mode === 'spectator') {
    if (!roomCode || !spectatorState || spectatorState.screen === 'setup') {
      return <SpectatorScreen roomCode={roomCode ?? 'unknown'} status="waiting" />;
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
        onStopSharing={() => {}}
      />
    );
  }

  if (view === 'summary') {
    return (
      <GameSummaryScreen
        state={state}
        onNewGame={() => {
          handleDispatch({ type: 'RESET_GAME' });
          setView('game');
        }}
      />
    );
  }

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
      onStopSharing={handleStopSharing}
      onEndGame={state.roundHistory.length > 0 ? () => setView('summary') : undefined}
      onSignOut={signOutUser}
      onTransferHost={mode === 'host' && roomCode ? handleTransferHost : undefined}
      onCancelTransfer={handleCancelTransfer}
      transferPending={transferPending}
    />
  );
}

export default AppInner;
