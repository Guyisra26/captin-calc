import type { GameState } from './types';
import { authedFetch } from './firebaseSync';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string;
const HOST_POLL_INTERVAL_MS = 3000;
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface HostInfo { uid: string; epoch: number; }
export interface Handoff { token: string; createdAt: number; }

export function generateHandoffToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join('');
}

export function evaluateClaim(
  handoff: Handoff | null,
  token: string,
): { ok: true } | { ok: false; reason: 'expired' | 'mismatch' } {
  if (!handoff) return { ok: false, reason: 'expired' };
  if (handoff.token !== token) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

export function nextHostInfo(current: HostInfo | null, myUid: string): HostInfo {
  return { uid: myUid, epoch: (current?.epoch ?? 0) + 1 };
}

export function isStillHost(hostInfo: HostInfo | null, myUid: string): boolean {
  if (!hostInfo) return true;
  return hostInfo.uid === myUid;
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!DB_URL) return null;
  const res = await authedFetch(`${DB_URL}${path}.json`);
  if (!res.ok) return null;
  const raw = await res.json();
  return (raw ?? null) as T | null;
}

export function readHost(code: string): Promise<HostInfo | null> {
  return readJson<HostInfo>(`/rooms/${code}/host`);
}

export function readHandoff(code: string): Promise<Handoff | null> {
  return readJson<Handoff>(`/rooms/${code}/handoff`);
}

export async function writeHost(code: string, info: HostInfo): Promise<void> {
  if (!DB_URL) return;
  await authedFetch(`${DB_URL}/rooms/${code}/host.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
}

export async function createHandoff(code: string): Promise<string> {
  const token = generateHandoffToken();
  if (!DB_URL) return token;
  const handoff: Handoff = { token, createdAt: Date.now() };
  await authedFetch(`${DB_URL}/rooms/${code}/handoff.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(handoff),
  });
  return token;
}

export async function cancelHandoff(code: string): Promise<void> {
  if (!DB_URL) return;
  await authedFetch(`${DB_URL}/rooms/${code}/handoff.json`, { method: 'DELETE' });
}

async function readState(code: string): Promise<GameState | null> {
  if (!DB_URL) return null;
  const res = await authedFetch(`${DB_URL}/rooms/${code}/state.json`);
  if (!res.ok) return null;
  const raw = await res.json();
  return raw ? (JSON.parse(raw as string) as GameState) : null;
}

export async function claimHost(
  code: string,
  token: string,
  myUid: string,
): Promise<{ ok: true; state: GameState | null } | { ok: false; reason: 'expired' | 'mismatch' }> {
  const handoff = await readHandoff(code);
  const verdict = evaluateClaim(handoff, token);
  if (!verdict.ok) return verdict;
  const currentHost = await readHost(code);
  await writeHost(code, nextHostInfo(currentHost, myUid));
  await cancelHandoff(code);
  const state = await readState(code);
  return { ok: true, state };
}

export function subscribeHost(code: string, cb: (info: HostInfo | null) => void): () => void {
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      cb(await readHost(code));
    } catch (e) {
      console.error('Host poll error:', e);
    }
    if (!stopped) setTimeout(poll, HOST_POLL_INTERVAL_MS);
  };
  poll();
  return () => { stopped = true; };
}
