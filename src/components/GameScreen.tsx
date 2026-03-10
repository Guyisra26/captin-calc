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
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-amber-400">Captain Calculator</h1>
          {/* Spectator LIVE badge */}
          {mode === 'spectator' && roomCode && (
            <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE · {roomCode}
            </span>
          )}
          {/* Host room code badge */}
          {mode === 'host' && roomCode && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded-full font-medium hover:bg-emerald-500/30 transition-colors"
              title="Copy spectator link"
            >
              Room: {roomCode} · Copy Link
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 hidden sm:inline">
            {state.players.length} players
          </span>
          {mode !== 'spectator' && (
            <>
              <button
                onClick={() => setShowAddPlayer(v => !v)}
                className="btn btn-ghost px-3 py-1.5 text-sm"
              >
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
              className="btn btn-ghost px-3 py-1.5 text-sm text-emerald-400"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* Add Player Inline */}
      {showAddPlayer && mode !== 'spectator' && (
        <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Player name"
            className="flex-1 bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <button
            onClick={handleAddPlayer}
            className={`btn bg-emerald-500 text-white px-4 py-1.5 text-sm ${!newPlayerName.trim() ? 'btn-disabled' : ''}`}
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

      {/* Main Layout — responsive: stack on portrait, side-by-side on landscape */}
      <div className="flex-1 overflow-auto p-4">
        <div className="h-full flex flex-col lg:flex-row gap-4">
          {/* Left Column: Scoreboard + History */}
          <div className="lg:w-[320px] shrink-0 flex flex-col gap-4">
            <Scoreboard
              players={state.players}
              captainId={round?.captainId ?? state.captainId}
              removedBPlayerIds={round?.removedBPlayerIds}
              lastRound={state.roundHistory[state.roundHistory.length - 1]}
            />
            <RoundHistory history={state.roundHistory} />
          </div>

          {/* Right Column: Round Panel + Event Log */}
          <div className="flex-1 flex flex-col gap-4">
            <RoundPanel state={state} dispatch={dispatch} isReadOnly={mode === 'spectator'} />
            {round && (
              <EventLog events={round.events} roundNumber={round.roundNumber} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
