import type { RoundEvent } from '../types';

interface EventLogProps {
  events: RoundEvent[];
  roundNumber: number;
}

export default function EventLog({ events, roundNumber }: EventLogProps) {
  const getIcon = (type: RoundEvent['type']) => {
    switch (type) {
      case 'doubling': return '×2';
      case 'pivot': return '⟳';
      case 'removal': return '→';
      case 'resolution': return '★';
    }
  };

  const getStyle = (type: RoundEvent['type']): React.CSSProperties => {
    switch (type) {
      case 'doubling': return { color: 'var(--accent-strong)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' };
      case 'pivot': return { color: 'var(--violet)', background: 'var(--violet-dim)', border: '1px solid var(--violet-border)' };
      case 'removal': return { color: 'var(--color-negative)', background: 'var(--negative-dim)', border: '1px solid rgba(224,102,108,0.4)' };
      case 'resolution': return { color: 'var(--color-positive)', background: 'var(--positive-dim)', border: '1px solid rgba(87,201,138,0.35)' };
    }
  };

  return (
    <div className="card">
      <h3 className="section-label" style={{ marginBottom: '0.6rem' }}>Round {roundNumber} Events</h3>
      {events.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem' }}>No events yet</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-2" style={{ fontSize: '0.88rem' }}>
              <span
                style={{
                  ...getStyle(e.type),
                  padding: '0.1rem 0.35rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.15rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {getIcon(e.type)}
              </span>
              <span style={{ color: 'var(--text-dim)', lineHeight: 1.4 }}>{e.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
