import { useState } from 'react';
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

function BoardPoints({ flip = false, count = 14 }: { flip?: boolean; count?: number }) {
  const w = 100 / count;
  return (
    <svg width="100%" height="20" viewBox={`0 0 100 20`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = i * w;
        const fill = i % 2 === 0 ? '#b8832a' : '#2d0a00';
        const points = flip
          ? `${x},0 ${x + w},0 ${x + w / 2},20`
          : `${x},20 ${x + w},20 ${x + w / 2},0`;
        return <polygon key={i} points={points} fill={fill} />;
      })}
    </svg>
  );
}

export default function GameScreen({ state, dispatch, onUndo, canUndo, mode, roomCode, onCreateRoom }: GameScreenProps) {
  const round = state.currentRound;
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleReset = () => {
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
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--wood-darkest)' }}>

      {/* Triangle strip — top of board */}
      <BoardPoints />

      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              fontSize: '1.2rem',
              color: 'var(--gold-light)',
              letterSpacing: '0.04em',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            ♟ Captain
          </h1>

          {/* Spectator LIVE badge */}
          {mode === 'spectator' && roomCode && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 font-medium"
              style={{
                background: 'rgba(180,40,40,0.2)',
                color: '#e07070',
                border: '1px solid rgba(180,40,40,0.4)',
                borderRadius: '2px',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE · {roomCode}
            </span>
          )}

          {/* Host room code badge */}
          {mode === 'host' && roomCode && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs px-2 py-1 font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(90,160,50,0.15)',
                color: '#7ac858',
                border: '1px solid rgba(90,160,50,0.35)',
                borderRadius: '2px',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              ⚑ Room {roomCode} · Copy Link
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--cream-dark)', fontSize: '0.85rem', opacity: 0.6 }} className="hidden sm:inline">
            {state.players.length} players
          </span>
          {mode !== 'spectator' && (
            <>
              <button onClick={() => setShowAddPlayer(v => !v)} className="btn btn-ghost px-3 py-1.5 text-sm">
                + Player
              </button>
              <button
                onClick={onUndo}
                className={`btn btn-ghost px-3 py-1.5 text-sm ${!canUndo ? 'btn-disabled' : ''}`}
              >
                Undo
              </button>
              <button onClick={handleReset} className="btn btn-ghost px-3 py-1.5 text-sm">
                New Game
              </button>
            </>
          )}
          {mode === 'local' && (
            <button
              onClick={onCreateRoom}
              className="btn px-3 py-1.5 text-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(90,160,50,0.2), rgba(40,100,20,0.2))',
                color: '#7ac858',
                border: '1px solid rgba(90,160,50,0.4)',
              }}
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* Add Player Inline */}
      {showAddPlayer && mode !== 'spectator' && (
        <div
          className="px-4 py-2 flex items-center gap-2"
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
          {/* Left Column */}
          <div className="lg:w-[300px] shrink-0 flex flex-col gap-3">
            <Scoreboard
              players={state.players}
              captainId={round?.captainId ?? state.captainId}
              removedBPlayerIds={round?.removedBPlayerIds}
              lastRound={state.roundHistory[state.roundHistory.length - 1]}
            />
            <RoundHistory history={state.roundHistory} />
          </div>

          {/* Right Column */}
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
