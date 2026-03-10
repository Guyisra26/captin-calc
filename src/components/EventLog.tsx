import type { RoundEvent } from '../types';

interface EventLogProps {
  events: RoundEvent[];
  roundNumber: number;
}

export default function EventLog({ events, roundNumber }: EventLogProps) {
  const getIcon = (type: RoundEvent['type']) => {
    switch (type) {
      case 'doubling': return '×2';
      case 'removal': return '→';
      case 'resolution': return '★';
    }
  };

  const getColor = (type: RoundEvent['type']) => {
    switch (type) {
      case 'doubling': return 'text-amber-400 bg-amber-500/20';
      case 'removal': return 'text-red-400 bg-red-500/20';
      case 'resolution': return 'text-emerald-400 bg-emerald-500/20';
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Round {roundNumber} Events
      </h3>
      {events.length === 0 ? (
        <p className="text-slate-500 text-sm">No events yet</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`${getColor(e.type)} px-1.5 py-0.5 rounded text-xs font-bold shrink-0 mt-0.5`}>
                {getIcon(e.type)}
              </span>
              <span className="text-slate-300">{e.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
