import { describe, expect, it } from 'vitest';
import type { Exercise } from '../data/exercises';
import { decodeRoutineHash, encodeRoutineHash } from './routineCodec';

const exercise = (id: string): Exercise => ({
  id,
  nameJa: id,
  imageSrc: `/${id}.webp`,
  voiceSrc: `/${id}.mp3`,
  voiceDurationMs: 1_000,
  imageAltJa: id,
  enabled: true,
  review: { poseReviewed: true, reviewedAt: '2026-09-13', reviewer: 'test' },
  provenance: { voiceGenerator: 'VOICEVOX', voiceCharacter: '四国めたん' },
});
const manifest = [exercise('00A'), exercise('00B'), exercise('FFF')];

describe('routine codec', () => {
  it('round-trips and canonicalizes lowercase IDs and leading-zero decimals', () => {
    const decoded = decodeRoutineHash('#/v1/030/005/00a00b', manifest);
    expect(decoded).toMatchObject({
      ok: true,
      canonicalHash: '#/v1/30/5/00A00B',
    });
    if (decoded.ok)
      expect(encodeRoutineHash(decoded.routine)).toBe('#/v1/30/5/00A00B');
  });

  it.each([
    ['4', '0'],
    ['601', '0'],
    ['5', '121'],
    ['5', '-1'],
  ])('rejects duration boundary %s/%s', (exerciseSeconds, intervalSeconds) => {
    expect(
      decodeRoutineHash(
        `#/v1/${exerciseSeconds}/${intervalSeconds}/00A`,
        manifest,
      ).ok,
    ).toBe(false);
  });

  it.each([
    '#/v2/30/5/00A',
    '#/v1/x/5/00A',
    '#/v1/30/5/00',
    '#/v1/30/5/00G',
    '/v1/30/5/00A',
  ])('rejects malformed input %s', (hash) => {
    expect(decodeRoutineHash(hash, manifest).ok).toBe(false);
  });

  it('reports unknown and disabled IDs', () => {
    const result = decodeRoutineHash('#/v1/30/5/00A00C', manifest);
    expect(result).toMatchObject({ ok: false, unknownIds: ['00C'] });
  });

  it('allows the same exercise more than once', () => {
    const result = decodeRoutineHash('#/v1/5/0/00A00A', manifest);
    expect(result).toMatchObject({
      ok: true,
      routine: { exerciseIds: ['00A', '00A'] },
    });
  });

  it('accepts exact duration boundaries', () => {
    expect(decodeRoutineHash('#/v1/5/0/00A', manifest).ok).toBe(true);
    expect(decodeRoutineHash('#/v1/600/120/FFF', manifest).ok).toBe(true);
  });
});
