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
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Round History
      </h3>
      <div className="space-y-1.5">
        {[...history].reverse().map(r => (
          <div key={r.roundNumber}>
            <button
              onClick={() => setExpanded(expanded === r.roundNumber ? null : r.roundNumber)}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">R{r.roundNumber}</span>
                <span className="text-slate-300 font-medium">{r.captainName}</span>
                <span className="text-slate-500">vs</span>
                <span className="text-slate-300 font-medium">{r.representativeName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.winner === 'captain'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {r.winner === 'captain' ? 'CPT' : 'B'} wins
                </span>
                <span className="text-slate-500 text-sm">{expanded === r.roundNumber ? '−' : '+'}</span>
              </div>
            </button>

            {expanded === r.roundNumber && (
              <div className="ml-4 mt-1 space-y-1 text-sm text-slate-400 pl-3 border-l border-slate-700">
                <p>Final stake: {r.finalPerPlayerStake} per player</p>
                <p>Doublings: {r.doublings}</p>
                {r.removals.length > 0 && (
                  <p>Removed: {r.removals.join(', ')}</p>
                )}
                {r.events.map((e, i) => (
                  <p key={i} className="text-slate-500">{e.description}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
