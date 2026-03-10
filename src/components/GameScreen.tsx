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
}

export default function GameScreen({ state, dispatch, onUndo, canUndo }: GameScreenProps) {
  const round = state.currentRound;

  const handleReset = () => {
    if (window.confirm('Reset game? All data will be lost.')) {
      dispatch({ type: 'RESET_GAME' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 shrink-0">
        <h1 className="text-lg font-bold text-amber-400">Captain Calculator</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 hidden sm:inline">
            {state.players.length} players
          </span>
          <button
            onClick={onUndo}
            className={`btn btn-ghost px-3 py-1.5 text-sm ${!canUndo ? 'btn-disabled' : ''}`}
          >
            Undo
          </button>
          <button onClick={handleReset} className="btn btn-ghost px-3 py-1.5 text-sm">
            New Game
          </button>
        </div>
      </div>

      {/* Main Layout — responsive: stack on portrait, side-by-side on landscape */}
      <div className="flex-1 overflow-auto p-4">
        <div className="h-full flex flex-col lg:flex-row gap-4">
          {/* Left Column: Scoreboard + History */}
          <div className="lg:w-[320px] shrink-0 flex flex-col gap-4">
            <Scoreboard
              players={state.players}
              captainId={round?.captainId ?? state.captainId}
              activeBPlayerIds={round?.activeBPlayerIds}
              removedBPlayerIds={round?.removedBPlayerIds}
            />
            <RoundHistory history={state.roundHistory} />
          </div>

          {/* Right Column: Round Panel + Event Log */}
          <div className="flex-1 flex flex-col gap-4">
            <RoundPanel state={state} dispatch={dispatch} />
            {round && (
              <EventLog events={round.events} roundNumber={round.roundNumber} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
