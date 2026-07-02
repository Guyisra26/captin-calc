import { useState, useRef, useEffect } from 'react';
import type { GameState, GameAction, AppMode } from '../types';
import Scoreboard from './Scoreboard';
import RoundPanel from './RoundPanel';
import EventLog from './EventLog';
import RoundHistory from './RoundHistory';
import RemovePlayerModal from './RemovePlayerModal';

interface GameScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onUndo: () => void;
  canUndo: boolean;
  mode: AppMode;
  roomCode: string | null;
  onCreateRoom: () => void;
  onStopSharing: () => void;
  onEndGame?: () => void;
}

export default function GameScreen({
  state,
  dispatch,
  onUndo,
  canUndo,
  mode,
  roomCode,
  onCreateRoom,
  onStopSharing,
  onEndGame,
}: GameScreenProps) {
  const round = state.currentRound;
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isReadOnly = mode === 'spectator';
  const roundActive = round !== null && !round.isComplete;
  const roundStartBalances = state.currentRound?.startBalances ?? {};

  const normalizedExisting = new Set(state.players.map(p => p.name.trim().toLowerCase()));
  const candidateName = newPlayerName.trim().toLowerCase();
  const duplicateName = candidateName.length > 0 && normalizedExisting.has(candidateName);

  const disabledRemovalIds = new Set<string>();
  if (roundActive && round) {
    disabledRemovalIds.add(round.captainId);
    if (round.activeBPlayerIds.length <= 1) {
      for (const id of round.activeBPlayerIds) disabledRemovalIds.add(id);
    }
  }

  const removalHelperText = roundActive
    ? 'During an active round, captain and the last active Team B player cannot be removed.'
    : undefined;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const handleReset = () => {
    setMenuOpen(false);
    if (window.confirm('Reset game? All data will be lost.')) {
      dispatch({ type: 'RESET_GAME' });
    }
  };

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || duplicateName) return;
    dispatch({ type: 'ADD_PLAYER', name });
    setNewPlayerName('');
    setShowAddPlayer(false);
  };

  const handleCopyLink = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Spectator link copied');
    } catch {
      alert(url);
    }
    setMenuOpen(false);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="app-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="brand">
            Captain <span className="brand-accent">Tavla</span>
          </h1>

          <span className={`top-live-pill${roundActive ? '' : ' top-live-pill--idle'}`}>
            {roundActive && <span className="pulse-dot" />}
            {roundActive ? 'Round Live' : 'Paused'}
          </span>
          {isReadOnly && (
            <span className="top-live-pill top-live-pill--idle">Read Only</span>
          )}
        </div>

        {!isReadOnly && (
          <div ref={menuRef} className="relative">
            <button
              className={`menu-toggle ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
            >
              <span />
              <span />
              <span />
            </button>

            {menuOpen && (
              <div className="menu-pop">
                {mode === 'local' && (
                  <button
                    onClick={() => {
                      onCreateRoom();
                      setMenuOpen(false);
                    }}
                    className="menu-item"
                    style={{ color: 'var(--color-positive)' }}
                  >
                    ⚑ Share Read-Only
                  </button>
                )}

                {mode === 'host' && roomCode && (
                  <button onClick={handleCopyLink} className="menu-item" style={{ color: 'var(--color-positive)' }}>
                    ⎘ Copy Spectator Link
                  </button>
                )}

                {mode === 'host' && (
                  <button
                    onClick={() => {
                      onStopSharing();
                      setMenuOpen(false);
                    }}
                    className="menu-item"
                    style={{ color: 'var(--accent)' }}
                  >
                    ☐ Stop Sharing
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowAddPlayer(v => !v);
                    setMenuOpen(false);
                  }}
                  className="menu-item"
                >
                  + Add Player
                </button>

                {state.players.length > 2 && (
                  <button
                    onClick={() => {
                      setShowRemoveModal(true);
                      setMenuOpen(false);
                    }}
                    className="menu-item"
                  >
                    − Remove Player
                  </button>
                )}

                {onEndGame && !roundActive && (
                  <button
                    onClick={() => {
                      onEndGame();
                      setMenuOpen(false);
                    }}
                    className="menu-item"
                    style={{ color: 'var(--accent)' }}
                  >
                    ⬛ End Game
                  </button>
                )}

                <button onClick={handleReset} className="menu-item" style={{ color: 'var(--color-negative)' }}>
                  ✕ New Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {mode === 'host' && roomCode && (
        <div
          className="px-3 py-1.5 shrink-0 flex items-center justify-between gap-2"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="top-live-pill" style={{ whiteSpace: 'nowrap' }}>
            Sharing Code: {roomCode}
          </span>
          <button
            onClick={handleCopyLink}
            className="btn btn-ghost px-3 py-1 text-xs"
            style={{ minHeight: '32px' }}
          >
            Copy Link
          </button>
        </div>
      )}

      {showAddPlayer && !isReadOnly && (
        <div className="px-3 py-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
              placeholder="Player name"
              className="board-input flex-1"
              style={{ padding: '0.5rem 0.75rem' }}
              autoFocus
            />
            <button
              onClick={handleAddPlayer}
              className={`btn btn-captain px-4 py-1.5 text-sm ${!newPlayerName.trim() || duplicateName ? 'btn-disabled' : ''}`}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddPlayer(false);
                setNewPlayerName('');
              }}
              className="btn btn-ghost px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
          {duplicateName && (
            <p style={{ marginTop: '0.4rem', color: 'var(--color-negative)', fontSize: '0.82rem' }}>
              A player with this name already exists.
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--bg)' }}>
        <div className="h-full flex flex-col lg:flex-row gap-3">
          <div className="lg:w-[300px] shrink-0 flex flex-col gap-3">
            <Scoreboard
              players={state.players}
              captainId={round?.captainId ?? state.captainId}
              removedBPlayerIds={round?.removedBPlayerIds}
              roundActive={roundActive}
              roundStartBalances={roundStartBalances}
            />
            <RoundHistory history={state.roundHistory} />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <RoundPanel state={state} dispatch={dispatch} isReadOnly={isReadOnly} />
            {round && <EventLog events={round.events} roundNumber={round.roundNumber} />}
          </div>
        </div>
      </div>

      {!isReadOnly && canUndo && (
        <button className="fab-undo" onClick={onUndo} aria-label="Undo last action">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
      )}

      {showRemoveModal && !isReadOnly && (
        <RemovePlayerModal
          players={state.players}
          disabledPlayerIds={[...disabledRemovalIds]}
          helperText={removalHelperText}
          onConfirm={(playerId, balanceAdjustments) => {
            dispatch({ type: 'REMOVE_PLAYER', playerId, balanceAdjustments });
            setShowRemoveModal(false);
          }}
          onCancel={() => setShowRemoveModal(false)}
        />
      )}
    </div>
  );
}
