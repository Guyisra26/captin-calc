import type { Player } from '../types';

interface ScoreboardProps {
  players: Player[];
  captainId: string;
  removedBPlayerIds?: string[];
  roundActive: boolean;
  roundStartBalances: Record<string, number>;
}

export default function Scoreboard({ players, captainId, removedBPlayerIds, roundActive, roundStartBalances }: ScoreboardProps) {
  // During an active round: freeze display at round-start balances (hides mid-round removals).
  // After round ends: show actual balances + net delta (removal + resolution combined).
  const displayBalance = (p: Player): number =>
    roundActive ? (roundStartBalances[p.id] ?? p.balance) : p.balance;

  const delta = (p: Player): number | null => {
    if (roundActive) return null;
    const start = roundStartBalances[p.id];
    if (start === undefined) return null;
    const change = p.balance - start;
    return change === 0 ? null : change;
  };

  const sorted = [...players].sort((a, b) => displayBalance(b) - displayBalance(a));

  const getRoleBadge = (id: string) => {
    if (id === captainId) return <span className="badge-captain">CPT</span>;
    if (removedBPlayerIds?.includes(id)) return <span className="badge-out">OUT</span>;
    return <span className="badge-teamb">B</span>;
  };

  const zeroSum = players.reduce((s, p) => s + p.balance, 0) === 0;

  return (
    <div className="card">
      <h3 className="section-label" style={{ marginBottom: '0.75rem' }}>Scoreboard</h3>

      <div className="space-y-1">
        {sorted.map((p, i) => {
          const d = delta(p);
          const bal = displayBalance(p);
          const isCaptain = p.id === captainId;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-2.5 py-2"
              style={{
                borderRadius: '10px',
                background: isCaptain ? 'var(--accent-dim)' : 'var(--surface-2)',
                border: isCaptain ? '1px solid var(--accent-border)' : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', width: '1.1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: isCaptain ? 600 : 400 }}>
                  {p.name}
                </span>
                {getRoleBadge(p.id)}
              </div>
              <div className="flex items-center gap-2">
                {d !== null && (
                  <span
                    className="delta-chip"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '6px',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: d > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                      background: d > 0 ? 'var(--positive-dim)' : 'var(--negative-dim)',
                    }}
                  >
                    {d > 0 ? '+' : ''}{d}
                  </span>
                )}
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    minWidth: '3ch',
                    textAlign: 'right',
                    color: bal > 0 ? 'var(--color-positive)' : bal < 0 ? 'var(--color-negative)' : 'var(--text-dim)',
                  }}
                >
                  {bal > 0 ? '+' : ''}{bal}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="flex justify-between items-center mt-2 pt-2"
        style={{ borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-faint)' }}
      >
        <span>Zero-sum</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: zeroSum ? 'var(--color-positive)' : 'var(--color-negative)' }}>
          {zeroSum ? '✓ 0' : `✗ ${players.reduce((s, p) => s + p.balance, 0)}`}
        </span>
      </div>
    </div>
  );
}
