import { useState, useRef, useEffect, useMemo } from 'react';
import type { GameState, GameAction } from '../types';
import Scoreboard from './Scoreboard';
import RoundPanel from './RoundPanel';
import EventLog from './EventLog';
import RoundHistory from './RoundHistory';

interface GameScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onUndo: () => void;
  canUndo: boolean;
  mode: 'local' | 'host' | 'spectator';
  roomCode: string | null;
  onCreateRoom: () => void;
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

export default function GameScreen({ state, dispatch, onUndo, canUndo, mode, roomCode, onCreateRoom }: GameScreenProps) {
  const round = state.currentRound;
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Snapshot player balances at the start of each round.
  // During an active round the scoreboard shows these frozen values so that
  // mid-round removal settlements don't confuse the display. The delta shown
  // after the round ends is the net change (removals + resolution combined).
  const roundStartBalancesRef = useRef<Record<string, number>>({});
  const prevRoundNumberRef = useRef<number>(0);

  useEffect(() => {
    const r = state.currentRound;
    if (r && !r.isComplete && r.roundNumber !== prevRoundNumberRef.current) {
      prevRoundNumberRef.current = r.roundNumber;
      const snap: Record<string, number> = {};
      for (const p of state.players) snap[p.id] = p.balance;
      roundStartBalancesRef.current = snap;
    }
  }, [state.currentRound?.roundNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const roundActive = round !== null && !round.isComplete;
  const roundStartBalances = useMemo(
    () => roundStartBalancesRef.current,
    // Re-memoize when round activity changes (active → ended → new round)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundActive, state.currentRound?.roundNumber]
  );

  // Close menu on outside click
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
    if (!name) return;
    dispatch({ type: 'ADD_PLAYER', name });
    setNewPlayerName('');
    setShowAddPlayer(false);
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(url);
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
    <div className="h-full flex flex-col" style={{ background: 'var(--wood-darkest)' }}>

      {/* Triangle strip — top */}
      <BoardPoints />

      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
          position: 'relative',
        }}
      >
        {/* Left: title + live badges */}
        <div className="flex items-center gap-2 min-w-0">
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
            ♟ Captain
          </h1>

          {mode === 'spectator' && roomCode && (
            <span
              className="flex items-center gap-1 px-2 py-0.5"
              style={{
                background: 'rgba(180,40,40,0.2)',
                color: '#e07070',
                border: '1px solid rgba(180,40,40,0.4)',
                borderRadius: '2px',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE · {roomCode}
            </span>
          )}

          {mode === 'host' && roomCode && (
            <span
              style={{
                background: 'rgba(90,160,50,0.15)',
                color: '#7ac858',
                border: '1px solid rgba(90,160,50,0.35)',
                borderRadius: '2px',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.7rem',
                padding: '0.15rem 0.5rem',
                whiteSpace: 'nowrap',
              }}
            >
              ⚑ {roomCode}
            </span>
          )}
        </div>

        {/* Right: hamburger menu */}
        {mode !== 'spectator' && (
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
              {[0,1,2].map(i => (
                <span key={i} style={{ display: 'block', width: '18px', height: '2px', background: 'var(--gold-light)', borderRadius: '1px', transition: 'all 0.2s',
                  ...(menuOpen && i === 0 ? { transform: 'translateY(6px) rotate(45deg)' } : {}),
                  ...(menuOpen && i === 1 ? { opacity: 0, transform: 'scaleX(0)' } : {}),
                  ...(menuOpen && i === 2 ? { transform: 'translateY(-6px) rotate(-45deg)' } : {}),
                }} />
              ))}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  minWidth: '180px',
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
                    onClick={() => { onCreateRoom(); setMenuOpen(false); }}
                    style={{ ...menuItemStyle, color: '#7ac858', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    ⚑ Share / Create Room
                  </button>
                )}
                {mode === 'host' && roomCode && (
                  <button onClick={handleCopyLink} style={{ ...menuItemStyle, color: '#7ac858' }}>
                    ⎘ Copy Spectator Link
                  </button>
                )}
                <button
                  onClick={() => { setShowAddPlayer(v => !v); setMenuOpen(false); }}
                  style={menuItemStyle}
                >
                  + Add Player
                </button>
                <button
                  onClick={() => { onUndo(); setMenuOpen(false); }}
                  style={{ ...menuItemStyle, opacity: canUndo ? 1 : 0.35, pointerEvents: canUndo ? 'auto' : 'none' }}
                >
                  ↩ Undo
                </button>
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

      {/* Add Player Inline */}
      {showAddPlayer && mode !== 'spectator' && (
        <div
          className="px-3 py-2 flex items-center gap-2"
          style={{ background: 'var(--wood-mid)', borderBottom: '1px solid var(--gold-dark)' }}
        >
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
            className={`btn btn-captain px-4 py-1.5 text-sm ${!newPlayerName.trim() ? 'btn-disabled' : ''}`}
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
            className="btn btn-ghost px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Layout */}
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
            <RoundPanel state={state} dispatch={dispatch} isReadOnly={mode === 'spectator'} />
            {round && (
              <EventLog events={round.events} roundNumber={round.roundNumber} />
            )}
          </div>
        </div>
      </div>

      {/* Triangle strip — bottom */}
      <BoardPoints flip />
    </div>
  );
}
