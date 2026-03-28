import { useEffect, useState } from 'react';
import type { PlayerStats } from '../api';
import { api } from '../api';

interface Props {
  onBack: () => void;
}

function StatBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0.4rem 0.75rem',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.07)',
      minWidth: '72px',
    }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem', color: color ?? 'var(--cream)' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.62rem', color: 'var(--cream-dark)', opacity: 0.6, textAlign: 'center', marginTop: '2px', lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  );
}

function pct(rate: number | null): string {
  return rate !== null ? `${Math.round(rate * 100)}%` : '—';
}

function PlayerCard({ s, rank }: { s: PlayerStats; rank: number }) {
  const [open, setOpen] = useState(false);
  const balColor = s.total_balance > 0
    ? 'var(--color-positive)'
    : s.total_balance < 0
      ? 'var(--color-negative)'
      : 'var(--cream-dark)';

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => setOpen(v => !v)}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span style={{
          fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.1rem',
          color: 'var(--gold-dark)', minWidth: '1.6rem', textAlign: 'right',
        }}>
          {rank}.
        </span>

        {/* Avatar */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(200,150,40,0.15)',
          border: '1px solid rgba(200,150,40,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {s.photo_url
            ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: 'var(--gold)', fontSize: '1rem' }}>
                {s.name[0]?.toUpperCase()}
              </span>
          }
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cream-dark)', opacity: 0.55 }}>
            {s.games_played} game{s.games_played !== 1 ? 's' : ''} · {s.rounds_played} rounds
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem', color: balColor }}>
            {s.total_balance > 0 ? '+' : ''}{s.total_balance}
          </span>
          <span style={{ color: 'var(--cream-dark)', opacity: 0.4, fontSize: '0.8rem' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded stats */}
      {open && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <StatBadge label="W / L" value={`${s.wins} / ${s.losses}`} />
            <StatBadge
              label="As Captain"
              value={pct(s.captain_win_rate)}
              color="var(--gold)"
            />
            <StatBadge
              label="As Team B"
              value={pct(s.teamb_win_rate)}
            />
            <StatBadge label="Avg Stake" value={String(s.avg_stake)} />
            <StatBadge
              label="Best Round"
              value={s.biggest_win !== null ? `+${s.biggest_win}` : '—'}
              color="var(--color-positive)"
            />
            <StatBadge
              label="Worst Round"
              value={s.biggest_loss !== null ? String(s.biggest_loss) : '—'}
              color="var(--color-negative)"
            />
            {s.first_double_win_rate !== null && (
              <StatBadge
                label="1st Double"
                value={pct(s.first_double_win_rate)}
                color="var(--gold-light)"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardScreen({ onBack }: Props) {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch(() => setError('Failed to load stats. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--wood-darkest)' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
        }}
      >
        <button onClick={onBack} className="btn btn-ghost px-3 py-1.5 text-sm">
          ← Back
        </button>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 900,
          fontSize: '1.1rem',
          color: 'var(--gold-light)',
          letterSpacing: '0.04em',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          ♟ Dashboard
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--wood-dark)' }}>
        {loading && (
          <p style={{ color: 'var(--cream-dark)', textAlign: 'center', marginTop: '3rem', opacity: 0.5, fontStyle: 'italic' }}>
            Loading stats...
          </p>
        )}
        {error && (
          <p style={{ color: 'var(--color-negative)', textAlign: 'center', marginTop: '3rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}
        {!loading && !error && stats.length === 0 && (
          <p style={{ color: 'var(--cream-dark)', textAlign: 'center', marginTop: '3rem', opacity: 0.5, fontStyle: 'italic' }}>
            No games played yet.
          </p>
        )}

        <div className="space-y-2 max-w-lg mx-auto">
          {stats.map((s, i) => (
            <PlayerCard key={s.id} s={s} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
