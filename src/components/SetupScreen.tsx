import { useState, useCallback, useRef } from 'react';

interface SetupProps {
  onStartGame: (
    players: { id: string; name: string }[],
    captainId: string,
    teamBOrder: string[],
    initialBalances?: Record<string, number>
  ) => void;
}

interface PlayerEntry {
  id: string;
  name: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
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
    setPlayers(prev => [...prev, { id: crypto.randomUUID(), name: '' }]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 2) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const updateName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const validPlayers = players
    .map(p => ({ ...p, name: p.name.trim() }))
    .filter(p => p.name.length > 0);

  const normalizedNames = validPlayers.map(p => normalizeName(p.name));
  const hasDuplicateNames = new Set(normalizedNames).size !== normalizedNames.length;
  const canProceedToCapt = validPlayers.length >= 2 && !hasDuplicateNames;

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
    if (!canProceedToCapt) return;
    onStartGame(
      validPlayers.map(p => ({ id: p.id, name: p.name })),
      captainId,
      teamBOrder
    );
  };

  const handleStartResume = () => {
    if (!canProceedToCapt) return;

    const initialBalances: Record<string, number> = {};
    for (const p of validPlayers) {
      initialBalances[p.id] = parseFloat(balances[p.id] || '0') || 0;
    }

    onStartGame(
      validPlayers.map(p => ({ id: p.id, name: p.name })),
      captainId,
      teamBOrder,
      initialBalances
    );
  };

  const balanceSum = validPlayers.reduce((sum, p) => sum + (parseFloat(balances[p.id] || '0') || 0), 0);
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
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
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
    <div className="min-h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg)', padding: 0 }}>
      <div className="flex-1 flex items-center justify-center w-full p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(2rem, 6vw, 2.75rem)',
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              Captain <span style={{ color: 'var(--accent)' }}>Tavla</span>
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginTop: '0.5rem' }}>
              Stakes, doublings & balances
            </p>
          </div>

          {step === 'names' && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '1rem' }}>
                Players
              </h2>

              <div className="space-y-2.5 mb-4">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', width: '1.4rem', textAlign: 'right', fontSize: '0.85rem' }}>{i + 1}</span>
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
                        className="btn btn-ghost px-3 py-1 text-sm"
                        style={{ minHeight: '32px', color: 'var(--color-removed)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={addPlayer} className="btn btn-ghost flex-1">+ Add Player</button>
                <button onClick={goToCaptainSelect} className={`btn btn-captain flex-1 ${!canProceedToCapt ? 'btn-disabled' : ''}`}>Next →</button>
              </div>

              {validPlayers.length < 2 && (
                <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  Enter at least 2 player names.
                </p>
              )}
              {hasDuplicateNames && (
                <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem', marginTop: '0.3rem', textAlign: 'center' }}>
                  Duplicate player names are not allowed.
                </p>
              )}
            </div>
          )}

          {step === 'captain' && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
                Choose Captain
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Who leads Round 1?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {validPlayers.map(p => (
                  <button key={p.id} onClick={() => selectCaptain(p.id)} className="btn btn-captain text-lg">
                    {p.name}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('names')} className="btn btn-ghost w-full mt-3">← Back</button>
            </div>
          )}

          {step === 'order' && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                Crew Order
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Captain: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{getPlayerName(captainId)}</span>
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1rem' }}>
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
                      borderRadius: '10px',
                      border: i === 0 ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                      background: i === 0 ? 'var(--accent-dim)' : 'var(--surface-2)',
                    }}
                  >
                    <span style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', width: '2rem', textAlign: 'right', fontWeight: 700 }}>
                      {i === 0 ? 'REP' : `#${i + 1}`}
                    </span>
                    <span className="flex-1" style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                      {getPlayerName(id)}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => moveUp(i)} className={`btn btn-ghost px-2 py-1 text-sm ${i === 0 ? 'btn-disabled' : ''}`} style={{ minHeight: '32px' }}>↑</button>
                      <button onClick={() => moveDown(i)} className={`btn btn-ghost px-2 py-1 text-sm ${i === teamBOrder.length - 1 ? 'btn-disabled' : ''}`} style={{ minHeight: '32px' }}>↓</button>
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

          {step === 'mode' && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                Game Mode
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Start fresh or resume with existing balances?
              </p>

              <div className="space-y-2.5">
                <button onClick={handleStartFresh} className="btn btn-success w-full text-lg py-5 flex-col">
                  <span>New Game</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 400 }}>All balances start at 0</span>
                </button>
                <button onClick={() => setStep('balances')} className="btn btn-ghost w-full text-lg py-5 flex-col">
                  <span>Resume Game</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontWeight: 400 }}>Set custom opening balances</span>
                </button>
              </div>

              <button onClick={() => setStep('order')} className="btn btn-ghost w-full mt-3">← Back</button>
            </div>
          )}

          {step === 'balances' && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                Starting Balances
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Enter opening balances. Sum must be 0.
              </p>

              <div className="space-y-2.5 mb-3">
                {validPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="flex-1" style={{ color: 'var(--text)' }}>{p.name}</span>
                    <input
                      type="number"
                      step="1"
                      value={balances[p.id] ?? ''}
                      onChange={e => setBalances(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="board-input"
                      style={{ width: '110px', textAlign: 'right' }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <div style={{
                marginBottom: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background: 'var(--surface-2)',
                border: `1px solid ${isBalanceValid ? 'rgba(87,201,138,0.35)' : 'rgba(224,102,108,0.4)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Balance sum</span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  color: isBalanceValid ? 'var(--color-positive)' : 'var(--color-negative)',
                }}>
                  {balanceSum > 0 ? '+' : ''}{balanceSum}
                </span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('mode')} className="btn btn-ghost flex-1">← Back</button>
                <button onClick={handleStartResume} className={`btn btn-success flex-1 ${!isBalanceValid ? 'btn-disabled' : ''}`}>
                  Start Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
