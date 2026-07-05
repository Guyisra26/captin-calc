import { describe, it, expect } from 'vitest';
import {
  generateHandoffToken, evaluateClaim, nextHostInfo, isStillHost,
} from './hostTransfer';

describe('generateHandoffToken', () => {
  it('is 12 chars from the allowed alphabet', () => {
    const t = generateHandoffToken();
    expect(t).toHaveLength(12);
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(t)).toBe(true);
  });
});

describe('evaluateClaim', () => {
  it('null handoff → expired', () => {
    expect(evaluateClaim(null, 'ABC')).toEqual({ ok: false, reason: 'expired' });
  });
  it('token mismatch → mismatch', () => {
    expect(evaluateClaim({ token: 'XYZ', createdAt: 1 }, 'ABC')).toEqual({ ok: false, reason: 'mismatch' });
  });
  it('matching token → ok', () => {
    expect(evaluateClaim({ token: 'ABC', createdAt: 1 }, 'ABC')).toEqual({ ok: true });
  });
});

describe('nextHostInfo', () => {
  it('no current host → epoch 1', () => {
    expect(nextHostInfo(null, 'u1')).toEqual({ uid: 'u1', epoch: 1 });
  });
  it('increments the existing epoch and takes my uid', () => {
    expect(nextHostInfo({ uid: 'old', epoch: 3 }, 'u2')).toEqual({ uid: 'u2', epoch: 4 });
  });
});

describe('isStillHost', () => {
  it('no host record → still host (adopted/legacy room)', () => {
    expect(isStillHost(null, 'u1')).toBe(true);
  });
  it('same uid → still host', () => {
    expect(isStillHost({ uid: 'u1', epoch: 2 }, 'u1')).toBe(true);
  });
  it('different uid → stepped down', () => {
    expect(isStillHost({ uid: 'u2', epoch: 3 }, 'u1')).toBe(false);
  });
});
