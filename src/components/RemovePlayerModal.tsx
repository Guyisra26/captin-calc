import { useState } from 'react';
import type { Player } from '../types';

interface Props {
  players: Player[];
  onConfirm: (playerId: string, adjustments: Record<string, number>) => void;
  onCancel: () => void;
}

export default function RemovePlayerModal({ players, onConfirm, onCancel }: Props) {
  const [selectedId, setSelectedId] = useState<string>(players[0]?.id ?? '');
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const removedPlayer = players.find(p => p.id === selectedId);
  const remaining = players.filter(p => p.id !== selectedId);

  const getAdj = (id: string) => adjustments[id] ?? 0;
  const setAdj = (id: string, val: number) =>
    setAdjustments(prev => ({ ...prev, [id]: val }));

  const handleSelectPlayer = (id: string) => {
    setSelectedId(id);
    setAdjustments({});
  };

  const toDistribute = -(removedPlayer?.balance ?? 0);
  const distributed = remaining.reduce((s, p) => s + getAdj(p.id), 0);
  const leftover = toDistribute - distributed;
  const canConfirm = Math.abs(leftover) < 0.001 && removedPlayer !== undefined;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          border: '1px solid var(--gold-dark)',
          borderRadius: '6px',
          padding: '1.25rem',
          width: '100%',
          maxWidth: '380px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            color: 'var(--gold-light)',
            fontSize: '1rem',
            marginBottom: '1rem',
          }}
        >
          Remove Player
        </h2>

        {/* Player selector */}
        <label style={{ display: 'block', color: 'var(--cream-dark)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
          Player to remove
        </label>
        <select
          value={selectedId}
          onChange={e => handleSelectPlayer(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            color: 'var(--cream)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} (balance: {p.balance > 0 ? '+' : ''}{p.balance})
            </option>
          ))}
        </select>

        {removedPlayer && (
          <>
            {toDistribute !== 0 && (
              <p style={{ color: 'var(--cream-dark)', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                {removedPlayer.name}'s balance of <strong style={{ color: removedPlayer.balance > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                  {removedPlayer.balance > 0 ? '+' : ''}{removedPlayer.balance}
                </strong> must be distributed to remaining players (sum must reach 0).
              </p>
            )}

            {/* Per-player adjustments */}
            <div style={{ marginBottom: '1rem' }}>
              {remaining.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ flex: 1, color: 'var(--cream)', fontSize: '0.9rem' }}>
                    {p.name}
                    <span style={{ opacity: 0.4, fontSize: '0.78rem', marginLeft: '0.3rem' }}>
                      ({p.balance > 0 ? '+' : ''}{p.balance})
                    </span>
                  </span>
                  <button
                    onClick={() => setAdj(p.id, getAdj(p.id) - 1)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      background: 'rgba(224,85,85,0.2)',
                      border: '1px solid rgba(224,85,85,0.4)',
                      borderRadius: '3px',
                      color: 'var(--color-negative)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      minWidth: '2.8rem',
                      textAlign: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: getAdj(p.id) > 0 ? 'var(--color-positive)' : getAdj(p.id) < 0 ? 'var(--color-negative)' : 'var(--cream-dark)',
                    }}
                  >
                    {getAdj(p.id) > 0 ? '+' : ''}{getAdj(p.id)}
                  </span>
                  <button
                    onClick={() => setAdj(p.id, getAdj(p.id) + 1)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      background: 'rgba(79,200,74,0.2)',
                      border: '1px solid rgba(79,200,74,0.4)',
                      borderRadius: '3px',
                      color: 'var(--color-positive)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>

            {/* Running sum counter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              <span style={{ color: 'var(--cream-dark)', fontSize: '0.8rem' }}>
                Remaining to distribute:
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: Math.abs(leftover) < 0.001 ? 'var(--color-positive)' : 'var(--color-negative)',
                }}
              >
                {leftover > 0 ? '+' : ''}{leftover}
              </span>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onCancel} className="btn btn-ghost flex-1 py-2">
            Cancel
          </button>
          <button
            onClick={() => removedPlayer && onConfirm(selectedId, adjustments)}
            disabled={!canConfirm}
            className={`btn btn-captain flex-1 py-2 ${!canConfirm ? 'btn-disabled' : ''}`}
          >
            Confirm Remove
          </button>
        </div>
      </div>
    </div>
  );
}
