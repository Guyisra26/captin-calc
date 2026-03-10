import { useState } from 'react';
import type { GameState, GameAction, DoublingProposer } from '../types';

interface RoundPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isReadOnly?: boolean;
}

export default function RoundPanel({ state, dispatch, isReadOnly = false }: RoundPanelProps) {
  const [showRemovalPicker, setShowRemovalPicker] = useState(false);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());
  const [showResolve, setShowResolve] = useState(false);
  const [resolveWinType, setResolveWinType] = useState<'normal' | 'mars' | 'turkish' | null>(null);

  const round = state.currentRound;
  const getPlayerName = (id: string) => state.players.find(p => p.id === id)?.name ?? '';

  // No active round — show start button + last round summary
  if (!round || round.isComplete) {
    const nextRoundNum = (round?.roundNumber ?? 0) + 1;
    const lastRound = state.roundHistory[state.roundHistory.length - 1];

    return (
      <div className="card space-y-4">
        {/* Last Round Summary */}
        {lastRound && (
          <div className={`rounded-xl p-4 ${
            lastRound.winner === 'captain' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            <h3 className={`text-lg font-bold mb-2 ${
              lastRound.winner === 'captain' ? 'text-amber-400' : 'text-blue-400'
            }`}>
              Round {lastRound.roundNumber} — {lastRound.winner === 'captain' ? 'Captain' : 'Team B'} Won{lastRound.winType === 'turkish' ? ' (Turkish Mars!)' : lastRound.winType === 'mars' ? ' (Mars!)' : '!'}
            </h3>
            <div className="text-sm space-y-1">
              <p className="text-slate-400">
                {lastRound.captainName} (CPT) vs {lastRound.representativeName} (REP)
              </p>
              <p className="text-slate-400">
                Final stake: {lastRound.finalPerPlayerStake} per player | {lastRound.doublings} doublings
              </p>
              {lastRound.removals.length > 0 && (
                <p className="text-slate-400">Removed: {lastRound.removals.join(', ')}</p>
              )}
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Balance Changes</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(lastRound.balanceChanges).map(([pid, change]) => (
                    <span key={pid} className="text-sm">
                      <span className="text-slate-300">{getPlayerName(pid)}</span>
                      {' '}
                      <span className={change > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Round Info */}
        <div className="text-center">
          <p className="text-slate-400 mb-3">
            Next Captain: <span className="text-amber-400 font-semibold">{getPlayerName(state.captainId)}</span>
            {' | '}
            Next Rep: <span className="text-blue-400 font-semibold">{getPlayerName(state.teamBOrder[0])}</span>
          </p>
          {!isReadOnly && (
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
          )}
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
    if (selectedForRemoval.size >= activeCount) return;
    dispatch({ type: 'REMOVE_PLAYERS', playerIds: [...selectedForRemoval] });
    setShowRemovalPicker(false);
    setSelectedForRemoval(new Set());
  };

  const handlePivot = () => {
    if (round.nextDoublingProposer === 'either') return;
    dispatch({ type: 'PIVOT', pivoter: round.nextDoublingProposer as 'captain' | 'teamB' });
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
    if (!resolveWinType) return;
    dispatch({ type: 'RESOLVE_ROUND', winner, winType: resolveWinType });
    setShowResolve(false);
    setResolveWinType(null);
  };

  // Can removal even happen? Need more than 1 active Team B player
  const removalPossible = round.canRemove && activeCount > 1;

  // Pivot: opposing side can accept + counter-double in one move
  const canPivot = round.canPivot && round.nextDoublingProposer !== 'either';
  const pivotStake = round.perPlayerStake * 2;
  const pivoterLabel = round.nextDoublingProposer === 'captain' ? `Captain (${captainName})` : 'Team B';

  return (
    <div className="card space-y-4">
      {/* Round Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-200">Round {round.roundNumber}</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            Doublings: <span className="font-bold text-amber-400">{round.doublingCount}</span>
          </span>
          <span className="text-slate-500">
            Stake: <span className="font-bold text-white">{round.perPlayerStake}</span>
          </span>
        </div>
      </div>

      {/* Captain vs Representative */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center flex-1">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Captain</div>
          <div className="bg-amber-500/20 text-amber-400 font-bold px-4 py-2.5 rounded-xl text-lg">
            {captainName}
          </div>
        </div>
        <span className="text-2xl text-slate-600 font-bold">VS</span>
        <div className="text-center flex-1">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Representative</div>
          <div className="bg-blue-500/20 text-blue-400 font-bold px-4 py-2.5 rounded-xl text-lg">
            {repName}
          </div>
        </div>
      </div>

      {/* Stake Info */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700/50 rounded-xl p-2.5">
          <div className="text-xs text-slate-500">Per Player</div>
          <div className="text-2xl font-bold text-white">{round.perPlayerStake}</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-2.5">
          <div className="text-xs text-slate-500">Active B</div>
          <div className="text-2xl font-bold text-blue-400">{activeCount}</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-2.5">
          <div className="text-xs text-slate-500">Captain Risk</div>
          <div className="text-2xl font-bold text-amber-400">{captainStake}</div>
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
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
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
          round.nextDoublingProposer === 'captain'
            ? 'text-amber-400'
            : round.nextDoublingProposer === 'teamB'
            ? 'text-blue-400'
            : 'text-emerald-400'
        }`}>
          {round.nextDoublingProposer === 'captain'
            ? `Captain (${captainName})`
            : round.nextDoublingProposer === 'teamB'
            ? 'Team B'
            : 'Either side'}
        </span>
      </div>

      {/* Removal Prompt — only show if removal possible (>1 active B players) */}
      {removalPossible && !showRemovalPicker && !isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
          {canPivot && (
            <button
              onClick={handlePivot}
              className="btn bg-violet-500 text-white w-full"
            >
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
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

      {/* Auto-skip removal when only 1 active (can't remove last player) */}
      {round.canRemove && activeCount <= 1 && !isReadOnly && (
        <div className="bg-slate-700/50 rounded-xl p-3 text-sm text-slate-400 space-y-2">
          {canPivot && (
            <button
              onClick={handlePivot}
              className="btn bg-violet-500 text-white w-full"
            >
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
          <div>
            Only 1 active Team B player — removal not possible.
            <button onClick={handleSkipRemoval} className="btn btn-ghost ml-2 px-3 py-1 text-sm">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Removal Picker */}
      {showRemovalPicker && removalPossible && !isReadOnly && (
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
                {id === round.representativeId && ' ★'}
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
      {!isReadOnly && (
      <div className="border-t border-slate-700 pt-4 space-y-2">
        {/* Initial Double — only at round start (no events yet) */}
        {round.events.length === 0 && !showResolve && (
          <button
            onClick={() => dispatch({ type: 'INITIAL_DOUBLE' })}
            className="btn bg-purple-500 text-white w-full"
          >
            Initial Double → {round.perPlayerStake * 2}
          </button>
        )}

        {/* Pivot Button — when canPivot but no removal window (Captain doubled, Team B can pivot) */}
        {!round.canRemove && canPivot && !showResolve && (
          <button
            onClick={handlePivot}
            className="btn bg-violet-500 text-white w-full"
          >
            {pivoterLabel} Pivots → {pivotStake}
          </button>
        )}

        {/* Doubling Buttons */}
        {!round.canRemove && !showResolve && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDouble('teamB')}
              className={`btn btn-teamb ${
                round.nextDoublingProposer !== 'teamB' && round.nextDoublingProposer !== 'either' ? 'btn-disabled' : ''
              }`}
            >
              Team B Doubles → {round.perPlayerStake * 2}
            </button>
            <button
              onClick={() => handleDouble('captain')}
              className={`btn btn-captain ${
                round.nextDoublingProposer !== 'captain' && round.nextDoublingProposer !== 'either' ? 'btn-disabled' : ''
              }`}
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

        {/* Step 1: Choose win type */}
        {showResolve && !resolveWinType && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm mb-3 font-medium text-center">How did the round end?</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setResolveWinType('normal')}
                className="btn btn-success py-5 flex-col"
              >
                <span className="text-base font-bold">Normal</span>
                <span className="text-xs opacity-70">×1</span>
                <span className="text-xs opacity-70">{round.perPlayerStake * activeCount} pts</span>
              </button>
              <button
                onClick={() => setResolveWinType('mars')}
                className="btn bg-orange-500 text-white py-5 flex-col"
              >
                <span className="text-base font-bold">Mars</span>
                <span className="text-xs opacity-70">×2</span>
                <span className="text-xs opacity-70">{round.perPlayerStake * activeCount * 2} pts</span>
              </button>
              <button
                onClick={() => setResolveWinType('turkish')}
                className="btn bg-red-600 text-white py-5 flex-col"
              >
                <span className="text-base font-bold">Turkish Mars</span>
                <span className="text-xs opacity-70">×3</span>
                <span className="text-xs opacity-70">{round.perPlayerStake * activeCount * 3} pts</span>
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

        {/* Step 2: Choose winner */}
        {showResolve && resolveWinType && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm mb-1 font-medium text-center">
              {resolveWinType === 'turkish' ? 'Turkish Mars (×3)' : resolveWinType === 'mars' ? 'Mars (×2)' : 'Normal'} — Who won?
            </p>
            <p className="text-slate-400 text-xs mb-3 text-center">
              {round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount} total points at stake
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleResolve('captain')}
                className="btn btn-captain text-lg py-5 flex-col"
              >
                <span>Captain Wins</span>
                <span className="text-xs opacity-70">
                  {captainName} +{round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount}
                </span>
              </button>
              <button
                onClick={() => handleResolve('teamB')}
                className="btn btn-teamb text-lg py-5 flex-col"
              >
                <span>Team B Wins</span>
                <span className="text-xs opacity-70">
                  {captainName} −{round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount}
                </span>
              </button>
            </div>
            <button
              onClick={() => setResolveWinType(null)}
              className="btn btn-ghost w-full mt-2"
            >
              Back
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
