const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('captainCalc_jwt');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export interface PlayerSummary {
  id: string;
  name: string;
  photo_url: string | null;
}

export interface PlayerStats extends PlayerSummary {
  games_played: number;
  total_balance: number;
  wins: number;
  losses: number;
  rounds_as_captain: number;
  wins_as_captain: number;
  rounds_as_teamb: number;
  wins_as_teamb: number;
  rounds_played: number;
  avg_stake: number;
  biggest_win: number | null;
  biggest_loss: number | null;
  captain_win_rate: number | null;
  teamb_win_rate: number | null;
  first_double_win_rate: number | null;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; display_name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getPlayers: () => request<PlayerSummary[]>('/players/public'),

  createPlayer: (name: string, photo_url?: string) =>
    request<PlayerSummary>('/players/public', {
      method: 'POST',
      body: JSON.stringify({ name, photo_url }),
    }),

  saveGame: (payload: {
    player_ids: string[];
    rounds: {
      round_number: number;
      captain_id: string;
      representative_id: string;
      winner: string;
      win_type: string;
      final_stake: number;
      doublings: number;
      first_doubler: string | null;
      removed_player_ids: string[];
      balance_changes: Record<string, number>;
    }[];
  }) =>
    request<{ id: string }>('/games', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDashboard: () => request<PlayerStats[]>('/dashboard'),

  getAdminUsers: () =>
    request<{ id: string; username: string; display_name: string }[]>('/admin/users'),

  createAdminUser: (data: { username: string; display_name: string; password: string }) =>
    request<{ ok: boolean }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
