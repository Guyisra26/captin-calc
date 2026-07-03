import { useState } from 'react';
import type { GameState, GameAction, DoublingProposer } from '../types';
import ActionWheel from './ActionWheel';

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

  if (!round || round.isComplete) {
    const nextRoundNum = (round?.roundNumber ?? 0) + 1;
    const lastRound = state.roundHistory[state.roundHistory.length - 1];

    return (
      <div className="card space-y-4">
        {lastRound && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: lastRound.winner === 'captain'
                ? 'var(--accent-dim)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${lastRound.winner === 'captain' ? 'var(--accent-border)' : 'var(--border)'}`,
            }}
          >
            <h3 style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: lastRound.winner === 'captain' ? 'var(--accent-strong)' : 'var(--text)',
              marginBottom: '0.5rem',
            }}>
              Round {lastRound.roundNumber} — {lastRound.winner === 'captain' ? 'Captain' : 'Crew'} Won
              {lastRound.winType === 'turkish' ? ' (Turkish Mars!)' : lastRound.winType === 'mars' ? ' (Mars!)' : '!'}
            </h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }} className="space-y-1">
              <p>{lastRound.captainName} (CPT) vs {lastRound.representativeName} (REP)</p>
              <p>Stake: {lastRound.finalPerPlayerStake}/player · {lastRound.doublings} doublings</p>
              {lastRound.removals.length > 0 && <p>Removed: {lastRound.removals.join(', ')}</p>}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="section-label" style={{ marginBottom: '0.25rem' }}>Changes</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(lastRound.balanceChanges).map(([pid, change]) => (
                    <span key={pid} style={{ fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text)' }}>{getPlayerName(pid)}</span>
                      {' '}
                      <span style={{ fontWeight: 700, color: change > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            Next Captain: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{getPlayerName(state.captainId)}</span>
            {' · '}
            Next Rep: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{getPlayerName(state.teamBOrder[0])}</span>
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

  const removalPossible = round.canRemove && activeCount > 1;
  const canPivot = round.canPivot && round.nextDoublingProposer !== 'either';
  const pivotStake = round.perPlayerStake * 2;
  const pivoterLabel = round.nextDoublingProposer === 'captain' ? `Captain (${captainName})` : 'Crew';

  return (
    <div className="card space-y-4">
      {/* Round Header */}
      <div className="flex items-center justify-between">
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
          Round {round.roundNumber}
        </h3>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Doublings: <span style={{ fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{round.doublingCount}</span>
          </span>
          {/* Doubling cube display */}
          <div className="doubling-cube">{round.perPlayerStake}</div>
        </div>
      </div>

      {/* Captain vs Representative */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center flex-1">
          <div className="section-label">Captain</div>
          <div
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-strong)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1.15rem',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
            }}
          >
            {captainName}
          </div>
        </div>
        <span style={{ fontSize: '1rem', color: 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>VS</span>
        <div className="text-center flex-1">
          <div className="section-label">Representative</div>
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1.15rem',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
            }}
          >
            {repName}
          </div>
        </div>
      </div>

      {/* Stakes Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Per Player', value: round.perPlayerStake, color: 'var(--text)' },
          { label: 'Active Crew', value: activeCount, color: 'var(--text-dim)' },
          { label: 'Captain Risk', value: captainStake, color: 'var(--accent)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.5rem',
            }}
          >
            <div className="section-label" style={{ marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.6rem', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Team B Players */}
      <div>
        <div className="section-label">Crew</div>
        <div className="flex flex-wrap gap-1.5">
          {round.teamBOrder.map(id => {
            const isActive = round.activeBPlayerIds.includes(id);
            const isRep = id === round.representativeId;
            return (
              <span
                key={id}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.9rem',
                  fontWeight: isRep ? 600 : 400,
                  textDecoration: !isActive ? 'line-through' : 'none',
                  color: !isActive ? 'var(--color-removed)' : isRep ? 'var(--text)' : 'var(--text-dim)',
                  background: !isActive ? 'transparent' : isRep ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: isRep && isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                }}
              >
                {getPlayerName(id)}
                {!isActive && ' (out)'}
                {isRep && isActive && ' ★'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Next Doubling Turn */}
      <div className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
        <span style={{ color: 'var(--text-faint)' }}>Next doubling:</span>
        <span style={{
          fontWeight: 600,
          color: round.nextDoublingProposer === 'captain'
            ? 'var(--accent)'
            : round.nextDoublingProposer === 'teamB'
            ? 'var(--text)'
            : 'var(--color-positive)',
        }}>
          {round.nextDoublingProposer === 'captain'
            ? `Captain (${captainName})`
            : round.nextDoublingProposer === 'teamB'
            ? 'Crew'
            : 'Either side'}
        </span>
      </div>

      {/* Removal Prompt */}
      {removalPossible && !showRemovalPicker && !isReadOnly && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '0.75rem' }} className="space-y-2">
          {canPivot && (
            <button onClick={handlePivot} className="btn btn-pivot w-full">
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
          <p style={{ color: 'var(--accent-strong)', fontSize: '0.88rem', fontWeight: 600 }}>
            Captain can remove players (settled at {round.perPlayerStake / 2} each)
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowRemovalPicker(true)} className="btn btn-captain flex-1">Remove Players</button>
            <button onClick={handleSkipRemoval} className="btn btn-ghost flex-1">Skip</button>
          </div>
        </div>
      )}

      {/* Only 1 active */}
      {round.canRemove && activeCount <= 1 && !isReadOnly && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', fontSize: '0.88rem', color: 'var(--text-dim)' }} className="space-y-2">
          {canPivot && (
            <button onClick={handlePivot} className="btn btn-pivot w-full">
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
          <div>
            Only 1 active Crew player — removal not possible.{' '}
            <button onClick={handleSkipRemoval} className="btn btn-ghost ml-2 px-3 py-1 text-sm" style={{ minHeight: '32px' }}>Continue</button>
          </div>
        </div>
      )}

      {/* Removal Picker */}
      {showRemovalPicker && removalPossible && !isReadOnly && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '0.75rem' }}>
          <p style={{ color: 'var(--accent-strong)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Select players to remove (keep at least 1):
          </p>
          <div className="space-y-1.5 mb-3">
            {round.activeBPlayerIds.map(id => (
              <button
                key={id}
                onClick={() => toggleRemoval(id)}
                className="w-full text-left px-4 py-2.5"
                style={{
                  borderRadius: '10px',
                  border: `1px solid ${selectedForRemoval.has(id) ? 'rgba(224,102,108,0.5)' : 'var(--border)'}`,
                  background: selectedForRemoval.has(id) ? 'var(--negative-dim)' : 'var(--surface-2)',
                  color: selectedForRemoval.has(id) ? 'var(--color-negative)' : 'var(--text)',
                  fontSize: '1rem',
                  transition: 'all 0.1s',
                }}
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
              className={`btn btn-danger flex-1 ${selectedForRemoval.size === 0 || selectedForRemoval.size >= activeCount ? 'btn-disabled' : ''}`}
            >
              Confirm Remove ({selectedForRemoval.size})
            </button>
            <button
              onClick={() => { setShowRemovalPicker(false); setSelectedForRemoval(new Set()); }}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isReadOnly && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }} className="space-y-2">
          {!round.canRemove && !showResolve && (
            <ActionWheel
              stake={round.perPlayerStake}
              captainName={captainName}
              canDoubleTeamB={round.nextDoublingProposer === 'teamB' || round.nextDoublingProposer === 'either'}
              canDoubleCaptain={round.nextDoublingProposer === 'captain' || round.nextDoublingProposer === 'either'}
              bottomAction={round.events.length === 0 ? 'initial' : (canPivot ? 'pivot' : null)}
              pivotStake={pivotStake}
              onDoubleTeamB={() => handleDouble('teamB')}
              onDoubleCaptain={() => handleDouble('captain')}
              onPivot={handlePivot}
              onInitialDouble={() => dispatch({ type: 'INITIAL_DOUBLE' })}
              onEndRound={() => setShowResolve(true)}
            />
          )}

          {/* Win type picker */}
          {showResolve && !resolveWinType && (
            <div style={{ background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.35)', borderRadius: '12px', padding: '1rem' }}>
              <p style={{ color: 'var(--color-positive)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', marginBottom: '0.75rem' }}>
                How did the round end?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setResolveWinType('normal')} className="btn btn-success py-5 flex-col" style={{ fontSize: '0.95rem' }}>
                  <span>Normal</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>×1</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{round.perPlayerStake * activeCount} pts</span>
                </button>
                <button onClick={() => setResolveWinType('mars')} className="btn btn-mars py-5 flex-col" style={{ fontSize: '0.95rem' }}>
                  <span>Mars</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>×2</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{round.perPlayerStake * activeCount * 2} pts</span>
                </button>
                <button onClick={() => setResolveWinType('turkish')} className="btn btn-turkish py-5 flex-col" style={{ fontSize: '0.95rem' }}>
                  <span>Turkish</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>×3</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{round.perPlayerStake * activeCount * 3} pts</span>
                </button>
              </div>
              <button onClick={() => setShowResolve(false)} className="btn btn-ghost w-full mt-2">Cancel</button>
            </div>
          )}

          {/* Winner picker */}
          {showResolve && resolveWinType && (
            <div style={{ background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.35)', borderRadius: '12px', padding: '1rem' }}>
              <p style={{ color: 'var(--color-positive)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', marginBottom: '0.25rem' }}>
                {resolveWinType === 'turkish' ? 'Turkish Mars (×3)' : resolveWinType === 'mars' ? 'Mars (×2)' : 'Normal'} — Who won?
              </p>
              <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                {round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount} total pts
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleResolve('captain')} className="btn btn-captain text-lg py-5 flex-col">
                  <span>Captain Wins</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>
                    {captainName} +{round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount}
                  </span>
                </button>
                <button onClick={() => handleResolve('teamB')} className="btn btn-teamb text-lg py-5 flex-col">
                  <span>Crew Wins</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>
                    {captainName} −{round.perPlayerStake * (resolveWinType === 'turkish' ? 3 : resolveWinType === 'mars' ? 2 : 1) * activeCount}
                  </span>
                </button>
              </div>
              <button onClick={() => setResolveWinType(null)} className="btn btn-ghost w-full mt-2">← Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
