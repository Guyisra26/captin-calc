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

function BoardPoints({ flip = false, count = 16 }: { flip?: boolean; count?: number }) {
  return (
    <svg width="100%" height="20" viewBox={`0 0 ${count} 1`} preserveAspectRatio="none" style={{ display: 'block', flexShrink: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const fill = i % 2 === 0 ? '#b8832a' : '#1e0a00';
        const pts = flip
          ? `${i},0 ${i + 1},0 ${i + 0.5},1`
          : `${i},1 ${i + 1},1 ${i + 0.5},0`;
        return <polygon key={i} points={pts} fill={fill} />;
      })}
    </svg>
  );
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

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: 'var(--cream)',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.85rem',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
  };

  return (
    <div className="h-full flex flex-col screen-shell" style={{ background: 'var(--wood-darkest)' }}>
      <BoardPoints />

      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
          position: 'relative',
          zIndex: 30,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '1.1rem',
              color: 'var(--gold-light)',
              letterSpacing: '0.04em',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            Captain Tavla
          </h1>

          <span className={`top-live-pill ${roundActive ? '' : 'top-live-pill--idle'}`}>
            {roundActive && <span className="pulse-dot" />}
            {roundActive ? 'Round Live' : 'Round Paused'}
          </span>
          {isReadOnly && (
            <span className="top-live-pill top-live-pill--idle">Read Only</span>
          )}
        </div>

        {!isReadOnly && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                background: menuOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '4px',
                color: 'var(--gold-light)',
                width: '40px',
                height: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.1s',
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '18px',
                    height: '2px',
                    background: 'var(--gold-light)',
                    borderRadius: '1px',
                    transition: 'all 0.2s',
                    ...(menuOpen && i === 0 ? { transform: 'translateY(6px) rotate(45deg)' } : {}),
                    ...(menuOpen && i === 1 ? { opacity: 0, transform: 'scaleX(0)' } : {}),
                    ...(menuOpen && i === 2 ? { transform: 'translateY(-6px) rotate(-45deg)' } : {}),
                  }}
                />
              ))}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  minWidth: '210px',
                  background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
                  border: '1px solid var(--gold-dark)',
                  borderRadius: '4px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {mode === 'local' && (
                  <button
                    onClick={() => {
                      onCreateRoom();
                      setMenuOpen(false);
                    }}
                    style={{ ...menuItemStyle, color: '#9ed17a' }}
                  >
                    ⚑ Share Read-Only
                  </button>
                )}

                {mode === 'host' && roomCode && (
                  <button onClick={handleCopyLink} style={{ ...menuItemStyle, color: '#9ed17a' }}>
                    ⎘ Copy Spectator Link
                  </button>
                )}

                {mode === 'host' && (
                  <button
                    onClick={() => {
                      onStopSharing();
                      setMenuOpen(false);
                    }}
                    style={{ ...menuItemStyle, color: '#e0b36a' }}
                  >
                    ☐ Stop Sharing
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowAddPlayer(v => !v);
                    setMenuOpen(false);
                  }}
                  style={menuItemStyle}
                >
                  + Add Player
                </button>

                {state.players.length > 2 && (
                  <button
                    onClick={() => {
                      setShowRemoveModal(true);
                      setMenuOpen(false);
                    }}
                    style={menuItemStyle}
                  >
                    − Remove Player
                  </button>
                )}

                <button
                  onClick={() => {
                    onUndo();
                    setMenuOpen(false);
                  }}
                  style={{ ...menuItemStyle, opacity: canUndo ? 1 : 0.35, pointerEvents: canUndo ? 'auto' : 'none' }}
                >
                  ↩ Undo
                </button>

                {onEndGame && !roundActive && (
                  <button
                    onClick={() => {
                      onEndGame();
                      setMenuOpen(false);
                    }}
                    style={{ ...menuItemStyle, color: '#c8923a' }}
                  >
                    ⬛ End Game
                  </button>
                )}

                <button
                  onClick={handleReset}
                  style={{ ...menuItemStyle, color: '#e07070', borderBottom: 'none' }}
                >
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
            background: 'rgba(0,0,0,0.28)',
            borderBottom: '1px solid rgba(201,147,44,0.28)',
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
        <div className="px-3 py-2" style={{ background: 'var(--wood-mid)', borderBottom: '1px solid var(--gold-dark)' }}>
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

      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--wood-dark)' }}>
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

      <BoardPoints flip />

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
