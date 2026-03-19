import { useState, useCallback, useRef } from 'react';

interface SetupProps {
  onStartGame: (players: { id: string; name: string }[], captainId: string, teamBOrder: string[], initialBalances?: Record<string, number>) => void;
}

interface PlayerEntry {
  id: string;
  name: string;
}

function BoardPoints({ flip = false, count = 18 }: { flip?: boolean; count?: number }) {
  const w = 100 / count;
  return (
    <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" style={{ display: 'block' }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = i * w;
        const fill = i % 2 === 0 ? '#b8832a' : '#2d0a00';
        const points = flip
          ? `${x},0 ${x + w},0 ${x + w / 2},24`
          : `${x},24 ${x + w},24 ${x + w / 2},0`;
        return <polygon key={i} points={points} fill={fill} />;
      })}
    </svg>
  );
}

export default function SetupScreen({ onStartGame }: SetupProps) {
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: crypto.randomUUID(), name: '' },
    { id: crypto.randomUUID(), name: '' },
  ]);
  const [captainId, setCaptainId] = useState<string>('');
  const [step, setStep] = useState<'names' | 'captain' | 'order' | 'mode' | 'balances'>('names');
  const [teamBOrder, setTeamBOrder] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addPlayer = () => {
    setPlayers([...players, { id: crypto.randomUUID(), name: '' }]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 2) return;
    setPlayers(players.filter(p => p.id !== id));
  };

  const updateName = (id: string, name: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  const validPlayers = players.filter(p => p.name.trim().length > 0);
  const canProceedToCapt = validPlayers.length >= 2;

  const goToCaptainSelect = () => {
    if (!canProceedToCapt) return;
    setStep('captain');
  };

  const selectCaptain = (id: string) => {
    setCaptainId(id);
    const order = validPlayers.filter(p => p.id !== id).map(p => p.id);
    setTeamBOrder(order);
    setStep('order');
  };

  const handleStartFresh = () => {
    onStartGame(
      validPlayers.map(p => ({ id: p.id, name: p.name.trim() })),
      captainId,
      teamBOrder
    );
  };

  const handleStartResume = () => {
    const parsed: Record<string, number> = {};
    for (const p of validPlayers) {
      parsed[p.id] = parseFloat(balances[p.id] || '0') || 0;
    }
    onStartGame(
      validPlayers.map(p => ({ id: p.id, name: p.name.trim() })),
      captainId,
      teamBOrder,
      parsed
    );
  };

  const balanceSum = validPlayers.reduce((sum, p) => {
    return sum + (parseFloat(balances[p.id] || '0') || 0);
  }, 0);

  const isBalanceValid = Math.abs(balanceSum) < 0.001;

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === to) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    setTeamBOrder(prev => {
      const copy = [...prev];
      const [removed] = copy.splice(from, 1);
      copy.splice(to, 0, removed);
      return copy;
    });
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setTeamBOrder(prev => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index >= teamBOrder.length - 1) return;
    setTeamBOrder(prev => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const getPlayerName = (id: string) => validPlayers.find(p => p.id === id)?.name ?? '';

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--wood-dark)', padding: '0' }}
    >
      {/* Top triangle strip */}
      <div className="w-full">
        <BoardPoints />
      </div>

      <div className="flex-1 flex items-center justify-center w-full p-6">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 900,
                fontSize: 'clamp(2rem, 6vw, 3rem)',
                color: 'var(--gold-light)',
                letterSpacing: '0.04em',
                textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 40px rgba(200,150,40,0.15)',
                lineHeight: 1.1,
              }}
            >
              ♟ Captain
            </h1>
            <p style={{ color: 'var(--cream-dark)', fontSize: '1.05rem', marginTop: '0.5rem', opacity: 0.7, fontStyle: 'italic' }}>
              Stakes, doublings & balances
            </p>
          </div>

          {/* ── Step: Names ── */}
          {step === 'names' && (
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                Players
              </h2>
              <div className="space-y-2.5 mb-4">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span style={{ color: 'var(--gold-dark)', fontFamily: 'monospace', width: '1.4rem', textAlign: 'right', fontSize: '0.85rem' }}>{i + 1}</span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => updateName(p.id, e.target.value)}
                      placeholder={`Player ${i + 1}`}
                      className="board-input flex-1"
                      autoFocus={i === 0}
                    />
                    {players.length > 2 && (
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="btn btn-ghost px-3 py-2 text-sm"
                        style={{ minHeight: '40px', color: 'var(--color-removed)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addPlayer} className="btn btn-ghost flex-1">
                  + Add Player
                </button>
                <button
                  onClick={goToCaptainSelect}
                  className={`btn btn-captain flex-1 ${!canProceedToCapt ? 'btn-disabled' : ''}`}
                >
                  Next →
                </button>
              </div>
              {!canProceedToCapt && (
                <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  Enter at least 2 player names
                </p>
              )}
            </div>
          )}

          {/* ── Step: Captain ── */}
          {step === 'captain' && (
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                Choose Captain
              </h2>
              <p style={{ color: 'var(--cream-dark)', opacity: 0.6, fontSize: '0.95rem', marginBottom: '1rem' }}>
                Who leads Round 1?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {validPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectCaptain(p.id)}
                    className="btn btn-captain text-lg"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('names')} className="btn btn-ghost w-full mt-3">
                ← Back
              </button>
            </div>
          )}

          {/* ── Step: Order ── */}
          {step === 'order' && (
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.25rem', letterSpacing: '0.03em' }}>
                Team B Order
              </h2>
              <p style={{ color: 'var(--cream-dark)', opacity: 0.6, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Captain: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{getPlayerName(captainId)}</span>
              </p>
              <p style={{ color: 'var(--cream-dark)', opacity: 0.5, fontSize: '0.85rem', marginBottom: '1rem' }}>
                First player is Representative. Drag or use arrows.
              </p>
              <div className="space-y-2 mb-5">
                {teamBOrder.map((id, i) => (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragEnter={() => handleDragEnter(i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-2.5 cursor-grab active:cursor-grabbing"
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: i === 0
                        ? '1px solid var(--gold-dark)'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: i === 0
                        ? 'rgba(200,150,40,0.12)'
                        : 'rgba(0,0,0,0.25)',
                      transition: 'all 0.1s',
                    }}
                  >
                    <span style={{ color: 'var(--gold-dark)', fontFamily: 'monospace', fontSize: '0.75rem', width: '2rem', textAlign: 'right', fontWeight: 700 }}>
                      {i === 0 ? 'REP' : `#${i + 1}`}
                    </span>
                    <span className="flex-1" style={{ fontSize: '1.05rem', color: 'var(--cream)', fontWeight: 400 }}>
                      {getPlayerName(id)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(i)}
                        className={`btn btn-ghost px-2 py-1 text-sm ${i === 0 ? 'btn-disabled' : ''}`}
                        style={{ minHeight: '32px' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        className={`btn btn-ghost px-2 py-1 text-sm ${i === teamBOrder.length - 1 ? 'btn-disabled' : ''}`}
                        style={{ minHeight: '32px' }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('captain')} className="btn btn-ghost flex-1">← Back</button>
                <button onClick={() => setStep('mode')} className="btn btn-success flex-1 text-lg">Next →</button>
              </div>
            </div>
          )}

          {/* ── Step: Mode ── */}
          {step === 'mode' && (
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.35rem', letterSpacing: '0.03em' }}>
                Game Mode
              </h2>
              <p style={{ color: 'var(--cream-dark)', opacity: 0.6, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Start fresh or resume with existing balances?
              </p>
              <div className="space-y-2.5">
                <button onClick={handleStartFresh} className="btn btn-success w-full text-lg py-5 flex-col">
                  <span>New Game</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 400 }}>All balances start at 0</span>
                </button>
                <button
                  onClick={() => {
                    const init: Record<string, string> = {};
                    for (const p of validPlayers) init[p.id] = '';
                    setBalances(init);
                    setStep('balances');
                  }}
                  className="btn btn-teamb w-full text-lg py-5 flex-col"
                >
                  <span>Resume Game</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 400 }}>Enter existing balances</span>
                </button>
              </div>
              <button onClick={() => setStep('order')} className="btn btn-ghost w-full mt-3">← Back</button>
            </div>
          )}

          {/* ── Step: Balances ── */}
          {step === 'balances' && (
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.25rem', letterSpacing: '0.03em' }}>
                Enter Balances
              </h2>
              <p style={{ color: 'var(--cream-dark)', opacity: 0.55, fontSize: '0.85rem', marginBottom: '1rem' }}>
                Must sum to zero.
              </p>
              <div className="space-y-2.5 mb-4">
                {validPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="flex-1 flex items-center gap-2" style={{ fontSize: '1rem', color: 'var(--cream)' }}>
                      {p.name}
                      {p.id === captainId && <span className="badge-captain">CPT</span>}
                    </span>
                    <input
                      type="number"
                      value={balances[p.id] ?? ''}
                      onChange={e => setBalances(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="0"
                      className="board-input"
                      style={{ width: '7rem', textAlign: 'right', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                ))}
              </div>

              {/* Zero-sum indicator */}
              <div
                className="flex items-center justify-between px-3 py-2.5 mb-3"
                style={{
                  borderRadius: '4px',
                  border: `1px solid ${isBalanceValid ? 'rgba(80,140,50,0.4)' : 'rgba(180,50,50,0.4)'}`,
                  background: isBalanceValid ? 'rgba(80,140,50,0.1)' : 'rgba(180,50,50,0.1)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--cream-dark)' }}>Sum</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: isBalanceValid ? 'var(--color-positive)' : 'var(--color-negative)',
                }}>
                  {balanceSum === 0 ? '0' : (balanceSum > 0 ? '+' : '')}{Math.round(balanceSum * 100) / 100}
                  {isBalanceValid ? ' ✓' : ''}
                </span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('mode')} className="btn btn-ghost flex-1">← Back</button>
                <button
                  onClick={handleStartResume}
                  className={`btn btn-success flex-1 text-lg ${!isBalanceValid ? 'btn-disabled' : ''}`}
                >
                  Start Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom triangle strip */}
      <div className="w-full">
        <BoardPoints flip />
      </div>
    </div>
  );
}
