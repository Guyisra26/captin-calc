import { useState } from 'react';
import type { GameState, GameAction, DoublingProposer } from '../types';

interface RoundPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function RoundPanel({ state, dispatch }: RoundPanelProps) {
  const [showRemovalPicker, setShowRemovalPicker] = useState(false);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());
  const [showResolve, setShowResolve] = useState(false);

  const round = state.currentRound;
  const getPlayerName = (id: string) => state.players.find(p => p.id === id)?.name ?? '';

  // No active round — show start button
  if (!round || round.isComplete) {
    const nextRoundNum = (round?.roundNumber ?? 0) + 1;
    return (
      <div className="card">
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-200 mb-2">
            {round?.isComplete ? 'Round Complete' : 'Ready to Start'}
          </h3>
          {round?.isComplete && (
            <p className="text-slate-400 mb-2">
              Next Captain: <span className="text-amber-400 font-semibold">{getPlayerName(state.captainId)}</span>
              {' | '}
              Next Rep: <span className="text-blue-400 font-semibold">{getPlayerName(state.teamBOrder[0])}</span>
            </p>
          )}
          <button
            onClick={() => {
              dispatch({ type: 'START_ROUND' });
              setShowRemovalPicker(false);
              setSelectedForRemoval(new Set());
              setShowResolve(false);
            }}
            className="btn btn-captain text-lg w-full"
          >
            Start Round {nextRoundNum}
          </button>
        </div>
      </div>
    );
  }

  const captainName = getPlayerName(round.captainId);
  const repName = getPlayerName(round.representativeId);
  const activeCount = round.activeBPlayerIds.length;
  const captainStake = round.perPlayerStake * activeCount;

  const handleDouble = (proposer: DoublingProposer) => {
    dispatch({ type: 'DOUBLE', proposer });
    setShowRemovalPicker(false);
    setSelectedForRemoval(new Set());
  };

  const handleRemove = () => {
    if (selectedForRemoval.size === 0) return;
    // Must leave at least 1 active
    if (selectedForRemoval.size >= activeCount) return;
    dispatch({ type: 'REMOVE_PLAYERS', playerIds: [...selectedForRemoval] });
    setShowRemovalPicker(false);
    setSelectedForRemoval(new Set());
  };

  const handleSkipRemoval = () => {
    dispatch({ type: 'SKIP_REMOVAL' });
    setShowRemovalPicker(false);
    setSelectedForRemoval(new Set());
  };

  const toggleRemoval = (id: string) => {
    setSelectedForRemoval(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResolve = (winner: 'captain' | 'teamB') => {
    dispatch({ type: 'RESOLVE_ROUND', winner });
    setShowResolve(false);
  };

  return (
    <div className="card space-y-4">
      {/* Round Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-200">Round {round.roundNumber}</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Doublings:</span>
          <span className="font-bold text-amber-400">{round.doublingCount}</span>
        </div>
      </div>

      {/* Captain vs Representative */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Captain</div>
          <div className="bg-amber-500/20 text-amber-400 font-bold px-4 py-2 rounded-xl text-lg">
            {captainName}
          </div>
        </div>
        <span className="text-2xl text-slate-500 font-bold">VS</span>
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Representative</div>
          <div className="bg-blue-500/20 text-blue-400 font-bold px-4 py-2 rounded-xl text-lg">
            {repName}
          </div>
        </div>
      </div>

      {/* Stake Info */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700/50 rounded-xl p-2">
          <div className="text-xs text-slate-500">Per Player</div>
          <div className="text-xl font-bold text-white">{round.perPlayerStake}</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-2">
          <div className="text-xs text-slate-500">Active B</div>
          <div className="text-xl font-bold text-blue-400">{activeCount}</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-2">
          <div className="text-xs text-slate-500">Captain Risk</div>
          <div className="text-xl font-bold text-amber-400">{captainStake}</div>
        </div>
      </div>

      {/* Active Team B Players */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Team B Players</div>
        <div className="flex flex-wrap gap-2">
          {round.teamBOrder.map(id => {
            const isActive = round.activeBPlayerIds.includes(id);
            const isRep = id === round.representativeId;
            return (
              <span
                key={id}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  !isActive
                    ? 'bg-slate-700/30 text-slate-500 line-through'
                    : isRep
                    ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {getPlayerName(id)}
                {!isActive && ' (out)'}
                {isRep && isActive && ' ★'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Doubling Turn Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Next doubling:</span>
        <span className={`font-semibold ${
          round.nextDoublingProposer === 'captain' ? 'text-amber-400' : 'text-blue-400'
        }`}>
          {round.nextDoublingProposer === 'captain' ? `Captain (${captainName})` : 'Team B'}
        </span>
      </div>

      {/* Removal Prompt */}
      {round.canRemove && !showRemovalPicker && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p className="text-amber-400 text-sm mb-2 font-medium">
            Captain can remove players (settled at {round.perPlayerStake / 2} each)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRemovalPicker(true)}
              className="btn btn-captain flex-1"
            >
              Remove Players
            </button>
            <button onClick={handleSkipRemoval} className="btn btn-ghost flex-1">
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Removal Picker */}
      {showRemovalPicker && round.canRemove && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p className="text-amber-400 text-sm mb-2 font-medium">
            Select players to remove (must keep at least 1):
          </p>
          <div className="space-y-2 mb-3">
            {round.activeBPlayerIds.map(id => (
              <button
                key={id}
                onClick={() => toggleRemoval(id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors ${
                  selectedForRemoval.has(id)
                    ? 'bg-red-500/30 border border-red-500 text-red-300'
                    : 'bg-slate-700/50 border border-slate-600 text-slate-300'
                }`}
              >
                {getPlayerName(id)}
                {selectedForRemoval.has(id) && ' ✕'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRemove}
              className={`btn btn-danger flex-1 ${
                selectedForRemoval.size === 0 || selectedForRemoval.size >= activeCount ? 'btn-disabled' : ''
              }`}
            >
              Confirm Remove ({selectedForRemoval.size})
            </button>
            <button
              onClick={() => {
                setShowRemovalPicker(false);
                setSelectedForRemoval(new Set());
              }}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-slate-700 pt-4 space-y-2">
        {/* Doubling Buttons */}
        {!round.canRemove && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDouble('teamB')}
              className={`btn btn-teamb ${round.nextDoublingProposer !== 'teamB' ? 'btn-disabled' : ''}`}
            >
              Team B Doubles → {round.perPlayerStake * 2}
            </button>
            <button
              onClick={() => handleDouble('captain')}
              className={`btn btn-captain ${round.nextDoublingProposer !== 'captain' ? 'btn-disabled' : ''}`}
            >
              Captain Doubles → {round.perPlayerStake * 2}
            </button>
          </div>
        )}

        {/* Resolve Round */}
        {!round.canRemove && !showResolve && (
          <button
            onClick={() => setShowResolve(true)}
            className="btn btn-success w-full"
          >
            End Round — Who Won?
          </button>
        )}

        {showResolve && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <p className="text-emerald-400 text-sm mb-3 font-medium text-center">Who won this round?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleResolve('captain')}
                className="btn btn-captain text-lg py-4"
              >
                Captain Wins
                <span className="text-xs block opacity-70">
                  +{round.perPlayerStake * activeCount}
                </span>
              </button>
              <button
                onClick={() => handleResolve('teamB')}
                className="btn btn-teamb text-lg py-4"
              >
                Team B Wins
                <span className="text-xs block opacity-70">
                  −{round.perPlayerStake * activeCount}
                </span>
              </button>
            </div>
            <button
              onClick={() => setShowResolve(false)}
              className="btn btn-ghost w-full mt-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
