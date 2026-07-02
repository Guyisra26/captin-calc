import { useEffect, useMemo, useState } from 'react';
import type { Player } from '../types';
import { suggestAllocation } from '../removalAllocation';

interface Props {
  players: Player[];
  disabledPlayerIds?: string[];
  helperText?: string;
  onConfirm: (playerId: string, adjustments: Record<string, number>) => void;
  onCancel: () => void;
}

export default function RemovePlayerModal({ players, disabledPlayerIds = [], helperText, onConfirm, onCancel }: Props) {
  const disabledSet = useMemo(() => new Set(disabledPlayerIds), [disabledPlayerIds]);
  const selectablePlayers = players.filter(p => !disabledSet.has(p.id));

  const [selectedId, setSelectedId] = useState<string>(selectablePlayers[0]?.id ?? '');
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedId || disabledSet.has(selectedId)) {
      const newId = selectablePlayers[0]?.id ?? '';
      setSelectedId(newId);
      if (newId) {
        const newRemoved = players.find(p => p.id === newId);
        const newRemaining = players.filter(p => p.id !== newId);
        if (newRemoved) {
          setAdjustments(suggestAllocation(newRemoved.balance, newRemaining));
        } else {
          setAdjustments({});
        }
      } else {
        setAdjustments({});
      }
    }
  }, [selectedId, disabledSet, selectablePlayers, players]);

  const removedPlayer = players.find(p => p.id === selectedId);
  const remaining = players.filter(p => p.id !== selectedId);

  const getAdj = (id: string) => adjustments[id] ?? 0;
  const setAdj = (id: string, val: number) =>
    setAdjustments(prev => ({ ...prev, [id]: val }));

  const handleSelectPlayer = (id: string) => {
    setSelectedId(id);
    const newRemoved = players.find(p => p.id === id);
    const newRemaining = players.filter(p => p.id !== id);
    if (newRemoved) {
      setAdjustments(suggestAllocation(newRemoved.balance, newRemaining));
    } else {
      setAdjustments({});
    }
  };

  // On first render, seed adjustments for the initial selectedId
  useEffect(() => {
    if (selectedId && removedPlayer) {
      setAdjustments(suggestAllocation(removedPlayer.balance, remaining));
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toDistribute = removedPlayer?.balance ?? 0;
  const distributed = remaining.reduce((s, p) => s + getAdj(p.id), 0);
  const leftover = toDistribute - distributed;

  const canConfirm =
    removedPlayer !== undefined &&
    !disabledSet.has(selectedId) &&
    remaining.length > 0 &&
    Math.abs(leftover) < 0.001;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '1.05rem',
            color: 'var(--text)',
            marginBottom: '1rem',
          }}
        >
          Remove Player
        </h2>

        {helperText && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '0.8rem', lineHeight: 1.4 }}>
            {helperText}
          </p>
        )}

        {selectablePlayers.length === 0 ? (
          <div
            style={{
              padding: '0.75rem',
              background: 'var(--negative-dim)',
              border: '1px solid rgba(224,102,108,0.4)',
              borderRadius: '10px',
              color: 'var(--color-negative)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            No player can be removed right now.
          </div>
        ) : (
          <>
            <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
              Player to remove
            </label>
            <select
              value={selectedId}
              onChange={e => handleSelectPlayer(e.target.value)}
              className="board-input"
              style={{ marginBottom: '1rem' }}
            >
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={disabledSet.has(p.id)}>
                  {p.name} (balance: {p.balance > 0 ? '+' : ''}{p.balance}){disabledSet.has(p.id) ? ' · locked' : ''}
                </option>
              ))}
            </select>

            {removedPlayer && (
              <>
                {toDistribute !== 0 && (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {removedPlayer.name}'s balance of{' '}
                    <strong style={{ color: removedPlayer.balance > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                      {removedPlayer.balance > 0 ? '+' : ''}{removedPlayer.balance}
                    </strong>{' '}
                    is settled by the players below (as if they already paid it out).
                  </p>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  {remaining.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.3rem 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ flex: 1, color: 'var(--text)', fontSize: '0.9rem' }}>
                        {p.name}
                        <span style={{ opacity: 0.4, fontSize: '0.78rem', marginLeft: '0.3rem' }}>
                          ({p.balance > 0 ? '+' : ''}{p.balance})
                        </span>
                      </span>
                      <button
                        onClick={() => setAdj(p.id, getAdj(p.id) - 1)}
                        style={{
                          padding: '0.2rem 0.6rem',
                          background: 'var(--negative-dim)',
                          border: '1px solid rgba(224,102,108,0.4)',
                          borderRadius: '8px',
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
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: '2.8rem',
                          textAlign: 'center',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: getAdj(p.id) > 0 ? 'var(--color-positive)' : getAdj(p.id) < 0 ? 'var(--color-negative)' : 'var(--text-dim)',
                        }}
                      >
                        {getAdj(p.id) > 0 ? '+' : ''}{getAdj(p.id)}
                      </span>
                      <button
                        onClick={() => setAdj(p.id, getAdj(p.id) + 1)}
                        style={{
                          padding: '0.2rem 0.6rem',
                          background: 'var(--positive-dim)',
                          border: '1px solid rgba(87,201,138,0.4)',
                          borderRadius: '8px',
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

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--surface-3)',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                  }}
                >
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    Remaining to allocate:
                  </span>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
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
          </>
        )}

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
