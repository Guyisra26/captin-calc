import { useState } from 'react';
import type { RoundSummary } from '../types';

interface RoundHistoryProps {
  history: RoundSummary[];
}

export default function RoundHistory({ history }: RoundHistoryProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="card">
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--gold-dark)',
          marginBottom: '0.6rem',
        }}
      >
        Round History
      </h3>
      <div className="space-y-1">
        {[...history].reverse().map(r => (
          <div key={r.roundNumber}>
            <button
              onClick={() => setExpanded(expanded === r.roundNumber ? null : r.roundNumber)}
              className="w-full text-left px-2.5 py-2 flex items-center justify-between"
              style={{
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.1s',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--gold-dark)', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                  R{r.roundNumber}
                </span>
                <span style={{ color: 'var(--cream-dark)', fontSize: '0.88rem' }}>{r.captainName}</span>
                <span style={{ color: 'var(--gold-dark)', fontSize: '0.75rem', opacity: 0.6 }}>vs</span>
                <span style={{ color: 'var(--cream-dark)', fontSize: '0.88rem' }}>{r.representativeName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '2px',
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    background: r.winner === 'captain' ? 'rgba(200,150,40,0.15)' : 'rgba(242,228,196,0.08)',
                    color: r.winner === 'captain' ? 'var(--gold-light)' : 'var(--cream-dark)',
                    border: r.winner === 'captain' ? '1px solid rgba(200,150,40,0.3)' : '1px solid rgba(242,228,196,0.12)',
                  }}
                >
                  {r.winner === 'captain' ? 'CPT' : 'B'}
                  {r.winType === 'turkish' ? ' TM' : r.winType === 'mars' ? ' M' : ''}
                </span>
                <span style={{ color: 'var(--gold-dark)', fontSize: '0.8rem', opacity: 0.7 }}>
                  {expanded === r.roundNumber ? '−' : '+'}
                </span>
              </div>
            </button>

            {expanded === r.roundNumber && (
              <div
                className="space-y-0.5"
                style={{
                  marginLeft: '0.75rem',
                  marginTop: '0.25rem',
                  paddingLeft: '0.75rem',
                  borderLeft: '2px solid rgba(200,150,40,0.2)',
                  fontSize: '0.82rem',
                  color: 'var(--cream-dark)',
                  opacity: 0.75,
                }}
              >
                <p>Stake: {r.finalPerPlayerStake}/player · {r.doublings} doublings</p>
                {r.removals.length > 0 && <p>Removed: {r.removals.join(', ')}</p>}
                {r.events.map((e, i) => (
                  <p key={i} style={{ opacity: 0.7 }}>{e.description}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
