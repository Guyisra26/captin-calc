import { useState, useCallback, useRef } from 'react';

interface SetupProps {
  onStartGame: (players: { id: string; name: string }[], captainId: string, teamBOrder: string[]) => void;
}

interface PlayerEntry {
  id: string;
  name: string;
}

export default function SetupScreen({ onStartGame }: SetupProps) {
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: crypto.randomUUID(), name: '' },
    { id: crypto.randomUUID(), name: '' },
  ]);
  const [captainId, setCaptainId] = useState<string>('');
  const [step, setStep] = useState<'names' | 'captain' | 'order'>('names');
  const [teamBOrder, setTeamBOrder] = useState<string[]>([]);
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

  const handleStart = () => {
    onStartGame(
      validPlayers.map(p => ({ id: p.id, name: p.name.trim() })),
      captainId,
      teamBOrder
    );
  };

  // Touch drag-and-drop for Team B ordering
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
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">Captain Calculator</h1>
          <p className="text-slate-400 text-lg">Track stakes, doublings & balances</p>
        </div>

        {/* Step: Player Names */}
        {step === 'names' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Add Players</h2>
            <div className="space-y-3 mb-4">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono w-6 text-right">{i + 1}</span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updateName(p.id, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    autoFocus={i === 0}
                  />
                  {players.length > 2 && (
                    <button
                      onClick={() => removePlayer(p.id)}
                      className="btn btn-danger px-3 py-2 text-sm"
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={addPlayer} className="btn btn-ghost flex-1">
                + Add Player
              </button>
              <button
                onClick={goToCaptainSelect}
                className={`btn btn-captain flex-1 ${!canProceedToCapt ? 'btn-disabled' : ''}`}
              >
                Next: Choose Captain
              </button>
            </div>
            {!canProceedToCapt && (
              <p className="text-red-400 text-sm mt-2 text-center">
                Enter at least 2 player names
              </p>
            )}
          </div>
        )}

        {/* Step: Captain Selection */}
        {step === 'captain' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Select Captain</h2>
            <p className="text-slate-400 mb-4">Who starts as Captain for Round 1?</p>
            <div className="grid grid-cols-2 gap-3">
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
            <button
              onClick={() => setStep('names')}
              className="btn btn-ghost w-full mt-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Step: Team B Order */}
        {step === 'order' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-2 text-slate-200">Team B Order</h2>
            <p className="text-slate-400 mb-1">
              Captain: <span className="text-amber-400 font-semibold">{getPlayerName(captainId)}</span>
            </p>
            <p className="text-slate-400 mb-4 text-sm">
              First player is the Representative. Drag or use arrows to reorder.
            </p>
            <div className="space-y-2 mb-6">
              {teamBOrder.map((id, i) => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-grab active:cursor-grabbing ${
                    i === 0
                      ? 'bg-blue-900/40 border-blue-500'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <span className="text-slate-500 font-mono w-6 text-right text-sm">
                    {i === 0 ? 'REP' : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-lg font-medium">{getPlayerName(id)}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveUp(i)}
                      className={`btn btn-ghost px-3 py-1 text-sm ${i === 0 ? 'btn-disabled' : ''}`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      className={`btn btn-ghost px-3 py-1 text-sm ${i === teamBOrder.length - 1 ? 'btn-disabled' : ''}`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('captain')} className="btn btn-ghost flex-1">
                Back
              </button>
              <button onClick={handleStart} className="btn btn-success flex-1 text-lg">
                Start Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
