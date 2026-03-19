import type { Player, RoundSummary } from '../types';

interface ScoreboardProps {
  players: Player[];
  captainId: string;
  removedBPlayerIds?: string[];
  lastRound?: RoundSummary;
}

export default function Scoreboard({ players, captainId, removedBPlayerIds, lastRound }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.balance - a.balance);

  const getRoleBadge = (id: string) => {
    if (id === captainId) return <span className="badge-captain">CPT</span>;
    if (removedBPlayerIds?.includes(id)) return <span className="badge-out">OUT</span>;
    return <span className="badge-teamb">B</span>;
  };

  const getLastDelta = (id: string): number | null => {
    if (!lastRound) return null;
    return lastRound.balanceChanges[id] ?? 0;
  };

  const zeroSum = players.reduce((s, p) => s + p.balance, 0) === 0;

  return (
    <div className="card">
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--gold-dark)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}
      >
        Scoreboard
      </h3>

      <div className="space-y-1">
        {sorted.map((p, i) => {
          const delta = getLastDelta(p.id);
          const isCaptain = p.id === captainId;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-2.5 py-2 rounded"
              style={{
                background: isCaptain
                  ? 'rgba(200,150,40,0.1)'
                  : 'rgba(0,0,0,0.2)',
                border: isCaptain
                  ? '1px solid rgba(200,150,40,0.2)'
                  : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--gold-dark)', fontSize: '0.75rem', width: '1.1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--cream)', fontWeight: isCaptain ? 600 : 400 }}>
                  {p.name}
                </span>
                {getRoleBadge(p.id)}
              </div>
              <div className="flex items-center gap-2">
                {delta !== null && delta !== 0 && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '2px',
                      fontFamily: 'monospace',
                      color: delta > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                      background: delta > 0 ? 'rgba(80,140,50,0.15)' : 'rgba(180,50,50,0.15)',
                    }}
                  >
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    minWidth: '3ch',
                    textAlign: 'right',
                    color: p.balance > 0
                      ? 'var(--color-positive)'
                      : p.balance < 0
                      ? 'var(--color-negative)'
                      : 'var(--cream-dark)',
                  }}
                >
                  {p.balance > 0 ? '+' : ''}{p.balance}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="flex justify-between items-center mt-2 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: 'var(--cream-dark)', opacity: 0.6 }}
      >
        <span>Zero-sum</span>
        <span style={{ fontFamily: 'monospace', color: zeroSum ? 'var(--color-positive)' : 'var(--color-negative)' }}>
          {zeroSum ? '✓ 0' : `✗ ${players.reduce((s, p) => s + p.balance, 0)}`}
        </span>
      </div>
    </div>
  );
}
