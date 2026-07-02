import { useMemo } from 'react';
import type { GameState } from '../types';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import RoundHistory from './RoundHistory';

const COLORS = ['#d4b36a', '#57c98a', '#e0666c', '#5fa8e8', '#c9d157', '#a78bfa'];

interface Props {
  state: GameState;
  onNewGame: () => void;
}

export default function GameSummaryScreen({ state, onNewGame }: Props) {
  const { players, roundHistory } = state;

  // starting balance = current balance minus all round changes
  const startingBalance = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of players) {
      const totalChange = roundHistory.reduce((s, r) => s + (r.balanceChanges[p.id] ?? 0), 0);
      map[p.id] = p.balance - totalChange;
    }
    return map;
  }, [players, roundHistory]);

  // line chart: balance per player per round (starts at round 0 = starting balance)
  const lineData = useMemo(() => {
    const points: Record<string, number | string>[] = [];
    const start: Record<string, number | string> = { round: 0 };
    for (const p of players) start[p.name] = startingBalance[p.id];
    points.push(start);

    const cumulative: Record<string, number> = {};
    for (const p of players) cumulative[p.id] = 0;

    for (let i = 0; i < roundHistory.length; i++) {
      const point: Record<string, number | string> = { round: i + 1 };
      for (const p of players) {
        cumulative[p.id] += roundHistory[i].balanceChanges[p.id] ?? 0;
        point[p.name] = startingBalance[p.id] + cumulative[p.id];
      }
      points.push(point);
    }
    return points;
  }, [players, roundHistory, startingBalance]);

  // bar chart: wins vs losses per player
  const barData = useMemo(() => {
    return players.map(p => ({
      name: p.name,
      Wins: roundHistory.filter(r => (r.balanceChanges[p.id] ?? 0) > 0).length,
      Losses: roundHistory.filter(r => (r.balanceChanges[p.id] ?? 0) < 0).length,
    }));
  }, [players, roundHistory]);

  // final standings sorted by final balance (same ordering logic as live scoreboard)
  const standings = useMemo(() => {
    return [...players].sort((a, b) => b.balance - a.balance);
  }, [players]);

  const chartTooltipStyle = {
    background: '#1a1e27',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '10px',
    color: '#edf0f5',
    fontSize: '0.8rem',
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="app-header">
        <h1 className="brand" style={{ flex: 1 }}>
          Tavla <span className="brand-accent">Summary</span>
        </h1>
        <button onClick={onNewGame} className="btn btn-captain px-4 py-1.5 text-sm">
          New Game
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4" style={{ background: 'var(--bg)' }}>

        {/* Final standings table */}
        <div className="card">
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Final Standings</h2>
          <div className="space-y-1">
            {standings.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem', minWidth: '1.4rem', fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1, color: 'var(--text)', fontSize: '0.95rem' }}>{p.name}</span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: p.balance > 0 ? 'var(--color-positive)' : p.balance < 0 ? 'var(--color-negative)' : 'var(--text-dim)',
                  }}
                >
                  {p.balance > 0 ? '+' : ''}{p.balance}
                </span>

              </div>
            ))}
          </div>
        </div>

        {/* Balance progression line chart */}
        {roundHistory.length > 0 && (
          <div className="card">
            <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Balance Progression</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="round"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }} />
                {players.map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Wins vs Losses bar chart */}
        {roundHistory.length > 0 && (
          <div className="card">
            <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Wins & Losses</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }} />
                <Bar dataKey="Wins" fill="#57c98a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Losses" fill="#e0666c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Round history */}
        <RoundHistory history={roundHistory} />

      </div>
    </div>
  );
}
