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
      <h3 className="section-label" style={{ marginBottom: '0.6rem' }}>Round History</h3>
      <div className="space-y-1">
        {[...history].reverse().map(r => (
          <div key={r.roundNumber}>
            <button
              onClick={() => setExpanded(expanded === r.roundNumber ? null : r.roundNumber)}
              className="w-full text-left px-2.5 py-2 flex items-center justify-between"
              style={{
                borderRadius: '10px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  R{r.roundNumber}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>{r.captainName}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>vs</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>{r.representativeName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    background: r.winner === 'captain' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.06)',
                    color: r.winner === 'captain' ? 'var(--accent-strong)' : 'var(--text-dim)',
                    border: r.winner === 'captain' ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                  }}
                >
                  {r.winner === 'captain' ? 'CPT' : 'B'}
                  {r.winType === 'turkish' ? ' TM' : r.winType === 'mars' ? ' M' : ''}
                </span>
                <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>
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
                  borderLeft: '2px solid var(--accent-border)',
                  fontSize: '0.82rem',
                  color: 'var(--text-dim)',
                }}
              >
                <p>Stake: {r.finalPerPlayerStake}/player · {r.doublings} doublings</p>
                {r.removals.length > 0 && <p>Removed: {r.removals.join(', ')}</p>}
                {r.events.map((e, i) => (
                  <p key={i} style={{ color: 'var(--text-faint)' }}>{e.description}</p>
                ))}

                {r.standingsAfter && r.standingsAfter.length > 0 && (
                  <div style={{ marginTop: '0.45rem' }}>
                    <p
                      className="section-label"
                      style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}
                    >
                      Table After Round
                    </p>
                    <div className="space-y-0.5" style={{ opacity: 0.92 }}>
                      {r.standingsAfter.map((s, idx) => (
                        <div key={s.playerId} className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                          <span>
                            <span style={{ color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', marginRight: '0.35rem' }}>{idx + 1}.</span>
                            <span style={{ color: 'var(--text)' }}>{s.name}</span>
                          </span>
                          <span
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              color:
                                s.balance > 0
                                  ? 'var(--color-positive)'
                                  : s.balance < 0
                                  ? 'var(--color-negative)'
                                  : 'var(--text-dim)',
                            }}
                          >
                            {s.balance > 0 ? '+' : ''}{s.balance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
