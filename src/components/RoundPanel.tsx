import { useState } from 'react';
import type { GameState, GameAction, DoublingProposer } from '../types';

interface RoundPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isReadOnly?: boolean;
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--gold-dark)',
  marginBottom: '0.5rem',
};

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
              borderRadius: '4px',
              background: lastRound.winner === 'captain'
                ? 'rgba(200,150,40,0.08)'
                : 'rgba(242,228,196,0.05)',
              border: `1px solid ${lastRound.winner === 'captain' ? 'rgba(200,150,40,0.25)' : 'rgba(242,228,196,0.12)'}`,
            }}
          >
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1.05rem',
              color: lastRound.winner === 'captain' ? 'var(--gold-light)' : 'var(--cream)',
              marginBottom: '0.5rem',
            }}>
              Round {lastRound.roundNumber} — {lastRound.winner === 'captain' ? 'Captain' : 'Team B'} Won
              {lastRound.winType === 'turkish' ? ' (Turkish Mars!)' : lastRound.winType === 'mars' ? ' (Mars!)' : '!'}
            </h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--cream-dark)', opacity: 0.75 }} className="space-y-1">
              <p>{lastRound.captainName} (CPT) vs {lastRound.representativeName} (REP)</p>
              <p>Stake: {lastRound.finalPerPlayerStake}/player · {lastRound.doublings} doublings</p>
              {lastRound.removals.length > 0 && <p>Removed: {lastRound.removals.join(', ')}</p>}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: '0.25rem' }}>Changes</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(lastRound.balanceChanges).map(([pid, change]) => (
                    <span key={pid} style={{ fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--cream)' }}>{getPlayerName(pid)}</span>
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
          <p style={{ color: 'var(--cream-dark)', opacity: 0.7, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            Next Captain: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{getPlayerName(state.captainId)}</span>
            {' · '}
            Next Rep: <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{getPlayerName(state.teamBOrder[0])}</span>
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
  const pivoterLabel = round.nextDoublingProposer === 'captain' ? `Captain (${captainName})` : 'Team B';

  return (
    <div className="card space-y-4">
      {/* Round Header */}
      <div className="flex items-center justify-between">
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--cream)', letterSpacing: '0.03em' }}>
          Round {round.roundNumber}
        </h3>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: '0.85rem', color: 'var(--cream-dark)', opacity: 0.65 }}>
            Doublings: <span style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace' }}>{round.doublingCount}</span>
          </span>
          {/* Doubling cube display */}
          <div className="doubling-cube">{round.perPlayerStake}</div>
        </div>
      </div>

      {/* Captain vs Representative */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center flex-1">
          <div style={sectionLabel}>Captain</div>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(200,150,40,0.2), rgba(120,80,20,0.2))',
              border: '1px solid rgba(200,150,40,0.35)',
              color: 'var(--gold-light)',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1.15rem',
              padding: '0.6rem 1rem',
              borderRadius: '4px',
              letterSpacing: '0.02em',
            }}
          >
            {captainName}
          </div>
        </div>
        <span style={{ fontSize: '1.1rem', color: 'var(--gold-dark)', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>VS</span>
        <div className="text-center flex-1">
          <div style={sectionLabel}>Representative</div>
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(242,228,196,0.15)',
              color: 'var(--cream)',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1.15rem',
              padding: '0.6rem 1rem',
              borderRadius: '4px',
              letterSpacing: '0.02em',
            }}
          >
            {repName}
          </div>
        </div>
      </div>

      {/* Stakes Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Per Player', value: round.perPlayerStake, color: 'var(--cream)' },
          { label: 'Active B', value: activeCount, color: 'var(--cream-dark)' },
          { label: 'Captain Risk', value: captainStake, color: 'var(--gold)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              padding: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.6rem', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Team B Players */}
      <div>
        <div style={sectionLabel}>Team B</div>
        <div className="flex flex-wrap gap-1.5">
          {round.teamBOrder.map(id => {
            const isActive = round.activeBPlayerIds.includes(id);
            const isRep = id === round.representativeId;
            return (
              <span
                key={id}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: isRep ? 600 : 400,
                  textDecoration: !isActive ? 'line-through' : 'none',
                  color: !isActive
                    ? 'var(--color-removed)'
                    : isRep
                    ? 'var(--cream)'
                    : 'var(--cream-dark)',
                  background: !isActive
                    ? 'rgba(0,0,0,0.2)'
                    : isRep
                    ? 'rgba(242,228,196,0.12)'
                    : 'rgba(242,228,196,0.06)',
                  border: isRep && isActive
                    ? '1px solid rgba(242,228,196,0.25)'
                    : '1px solid transparent',
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
        <span style={{ color: 'var(--cream-dark)', opacity: 0.55 }}>Next doubling:</span>
        <span style={{
          fontWeight: 600,
          color: round.nextDoublingProposer === 'captain'
            ? 'var(--gold)'
            : round.nextDoublingProposer === 'teamB'
            ? 'var(--cream)'
            : 'var(--color-positive)',
        }}>
          {round.nextDoublingProposer === 'captain'
            ? `Captain (${captainName})`
            : round.nextDoublingProposer === 'teamB'
            ? 'Team B'
            : 'Either side'}
        </span>
      </div>

      {/* Removal Prompt */}
      {removalPossible && !showRemovalPicker && !isReadOnly && (
        <div style={{ background: 'rgba(200,150,40,0.08)', border: '1px solid rgba(200,150,40,0.25)', borderRadius: '4px', padding: '0.75rem' }} className="space-y-2">
          {canPivot && (
            <button onClick={handlePivot} className="btn w-full" style={{ background: 'linear-gradient(135deg, #5a2a8a, #3a1060)', color: 'var(--cream)', border: '1px solid #7a40aa' }}>
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
          <p style={{ color: 'var(--gold-light)', fontSize: '0.88rem', fontWeight: 600 }}>
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
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0.75rem', fontSize: '0.88rem', color: 'var(--cream-dark)' }} className="space-y-2">
          {canPivot && (
            <button onClick={handlePivot} className="btn w-full" style={{ background: 'linear-gradient(135deg, #5a2a8a, #3a1060)', color: 'var(--cream)', border: '1px solid #7a40aa' }}>
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}
          <div>
            Only 1 active Team B player — removal not possible.{' '}
            <button onClick={handleSkipRemoval} className="btn btn-ghost ml-2 px-3 py-1 text-sm" style={{ minHeight: '32px' }}>Continue</button>
          </div>
        </div>
      )}

      {/* Removal Picker */}
      {showRemovalPicker && removalPossible && !isReadOnly && (
        <div style={{ background: 'rgba(200,150,40,0.08)', border: '1px solid rgba(200,150,40,0.25)', borderRadius: '4px', padding: '0.75rem' }}>
          <p style={{ color: 'var(--gold-light)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Select players to remove (keep at least 1):
          </p>
          <div className="space-y-1.5 mb-3">
            {round.activeBPlayerIds.map(id => (
              <button
                key={id}
                onClick={() => toggleRemoval(id)}
                className="w-full text-left px-4 py-2.5"
                style={{
                  borderRadius: '4px',
                  border: `1px solid ${selectedForRemoval.has(id) ? 'rgba(180,50,50,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  background: selectedForRemoval.has(id) ? 'rgba(180,50,50,0.2)' : 'rgba(0,0,0,0.25)',
                  color: selectedForRemoval.has(id) ? '#e07070' : 'var(--cream)',
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
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }} className="space-y-2">
          {round.events.length === 0 && !showResolve && (
            <button
              onClick={() => dispatch({ type: 'INITIAL_DOUBLE' })}
              className="btn w-full"
              style={{ background: 'linear-gradient(135deg, #5a1a8a, #3a0a60)', color: 'var(--cream)', border: '1px solid #7a3aaa' }}
            >
              Initial Double → {round.perPlayerStake * 2}
            </button>
          )}

          {!round.canRemove && canPivot && !showResolve && (
            <button
              onClick={handlePivot}
              className="btn w-full"
              style={{ background: 'linear-gradient(135deg, #5a2a8a, #3a1060)', color: 'var(--cream)', border: '1px solid #7a40aa' }}
            >
              {pivoterLabel} Pivots → {pivotStake}
            </button>
          )}

          {!round.canRemove && !showResolve && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDouble('teamB')}
                className={`btn btn-teamb ${round.nextDoublingProposer !== 'teamB' && round.nextDoublingProposer !== 'either' ? 'btn-disabled' : ''}`}
              >
                Team B ×2 → {round.perPlayerStake * 2}
              </button>
              <button
                onClick={() => handleDouble('captain')}
                className={`btn btn-captain ${round.nextDoublingProposer !== 'captain' && round.nextDoublingProposer !== 'either' ? 'btn-disabled' : ''}`}
              >
                Captain ×2 → {round.perPlayerStake * 2}
              </button>
            </div>
          )}

          {!round.canRemove && !showResolve && (
            <button onClick={() => setShowResolve(true)} className="btn btn-success w-full">
              End Round — Who Won?
            </button>
          )}

          {/* Win type picker */}
          {showResolve && !resolveWinType && (
            <div style={{ background: 'rgba(80,140,50,0.08)', border: '1px solid rgba(80,140,50,0.25)', borderRadius: '4px', padding: '1rem' }}>
              <p style={{ color: 'var(--color-positive)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', marginBottom: '0.75rem', fontFamily: "'Playfair Display', serif" }}>
                How did the round end?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setResolveWinType('normal')} className="btn btn-success py-5 flex-col" style={{ fontSize: '0.95rem' }}>
                  <span>Normal</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>×1</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{round.perPlayerStake * activeCount} pts</span>
                </button>
                <button onClick={() => setResolveWinType('mars')} className="btn py-5 flex-col" style={{ background: 'linear-gradient(135deg, #c06020, #803010)', color: 'var(--cream)', border: '1px solid #d07030', fontSize: '0.95rem' }}>
                  <span>Mars</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>×2</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{round.perPlayerStake * activeCount * 2} pts</span>
                </button>
                <button onClick={() => setResolveWinType('turkish')} className="btn py-5 flex-col" style={{ background: 'linear-gradient(135deg, #c04040, #801010)', color: 'var(--cream)', border: '1px solid #d05050', fontSize: '0.95rem' }}>
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
            <div style={{ background: 'rgba(80,140,50,0.08)', border: '1px solid rgba(80,140,50,0.25)', borderRadius: '4px', padding: '1rem' }}>
              <p style={{ color: 'var(--color-positive)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', marginBottom: '0.25rem', fontFamily: "'Playfair Display', serif" }}>
                {resolveWinType === 'turkish' ? 'Turkish Mars (×3)' : resolveWinType === 'mars' ? 'Mars (×2)' : 'Normal'} — Who won?
              </p>
              <p style={{ color: 'var(--cream-dark)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.75rem', opacity: 0.6 }}>
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
                  <span>Team B Wins</span>
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
