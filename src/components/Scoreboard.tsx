import type { Player } from '../types';

interface ScoreboardProps {
  players: Player[];
  captainId: string;
  activeBPlayerIds?: string[];
  removedBPlayerIds?: string[];
}

export default function Scoreboard({ players, captainId, activeBPlayerIds, removedBPlayerIds }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.balance - a.balance);

  const getRole = (id: string) => {
    if (id === captainId) return 'captain';
    if (removedBPlayerIds?.includes(id)) return 'removed';
    if (activeBPlayerIds?.includes(id)) return 'teamB';
    return 'teamB';
  };

  const getRoleBadge = (id: string) => {
    const role = getRole(id);
    if (role === 'captain') return <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">CPT</span>;
    if (role === 'removed') return <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full font-medium">OUT</span>;
    return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">B</span>;
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Scoreboard</h3>
      <div className="space-y-1.5">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg ${
              p.id === captainId ? 'bg-amber-500/10' : 'bg-slate-700/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm w-5">{i + 1}.</span>
              <span className="font-medium">{p.name}</span>
              {getRoleBadge(p.id)}
            </div>
            <span
              className={`font-bold tabular-nums text-lg ${
                p.balance > 0
                  ? 'text-emerald-400'
                  : p.balance < 0
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {p.balance > 0 ? '+' : ''}{p.balance}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-sm text-slate-500">
        <span>Sum</span>
        <span className="font-mono">
          {players.reduce((s, p) => s + p.balance, 0)}
        </span>
      </div>
    </div>
  );
}
