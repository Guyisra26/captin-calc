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
      case 'doubling': return { color: 'var(--gold)', background: 'rgba(200,150,40,0.15)', border: '1px solid rgba(200,150,40,0.25)' };
      case 'pivot': return { color: '#c080e8', background: 'rgba(180,80,220,0.12)', border: '1px solid rgba(180,80,220,0.25)' };
      case 'removal': return { color: '#e07070', background: 'rgba(180,50,50,0.12)', border: '1px solid rgba(180,50,50,0.25)' };
      case 'resolution': return { color: 'var(--color-positive)', background: 'rgba(80,140,50,0.12)', border: '1px solid rgba(80,140,50,0.25)' };
    }
  };

  return (
    <div className="card">
      <h3
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--gold-dark)',
          marginBottom: '0.6rem',
        }}
      >
        Round {roundNumber} Events
      </h3>
      {events.length === 0 ? (
        <p style={{ color: 'var(--cream-dark)', opacity: 0.4, fontSize: '0.9rem', fontStyle: 'italic' }}>No events yet</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-2" style={{ fontSize: '0.88rem' }}>
              <span
                style={{
                  ...getStyle(e.type),
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.15rem',
                  fontFamily: 'monospace',
                }}
              >
                {getIcon(e.type)}
              </span>
              <span style={{ color: 'var(--cream-dark)', lineHeight: 1.4 }}>{e.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
