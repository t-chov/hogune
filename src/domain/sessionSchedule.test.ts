import { describe, expect, it } from 'vitest';
import type { Exercise } from '../data/exercises';
import type { Routine } from './routineCodec';
import { buildSessionSchedule } from './sessionSchedule';

const exercise = (id: string, voiceDurationMs = 1_000): Exercise => ({
  id,
  nameJa: id,
  imageSrc: '',
  voiceSrc: '',
  voiceDurationMs,
  imageAltJa: id,
  enabled: true,
  review: { poseReviewed: true, reviewedAt: '2026-09-13', reviewer: 'test' },
  provenance: { voiceGenerator: 'VOICEVOX', voiceCharacter: '四国めたん' },
});
const routine = (
  exerciseSeconds: number,
  intervalSeconds: number,
): Routine => ({
  version: 'v1',
  exerciseSeconds,
  intervalSeconds,
  exerciseIds: ['00A', '00B'],
});

describe('session schedule', () => {
  it.each([5, 600])(
    'schedules exact completion for a %d-second exercise duration',
    (seconds) => {
      const events = buildSessionSchedule(routine(seconds, 5), [
        exercise('00A'),
        exercise('00B'),
      ]);
      expect(events.find((event) => event.type === 'complete')?.atMs).toBe(
        3_000 + seconds * 2_000 + 5_000,
      );
      expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    },
  );

  it('announces a next exercise early enough to avoid countdown overlap', () => {
    const events = buildSessionSchedule(routine(30, 5), [
      exercise('00A'),
      exercise('00B', 2_000),
    ]);
    const announcement = events.find((event) => event.id === 'announce-1');
    expect(announcement?.atMs).toBe(32_750);
    expect((announcement?.atMs ?? 0) + 2_000).toBeLessThanOrEqual(35_000 - 250);
  });

  it('omits an announcement that cannot fit safely before a zero interval', () => {
    const events = buildSessionSchedule(routine(5, 0), [
      exercise('00A'),
      exercise('00B', 3_000),
    ]);
    expect(events.some((event) => event.id === 'announce-1')).toBe(false);
  });

  it('orders simultaneous end, start, and completion events deterministically', () => {
    const zeroInterval = buildSessionSchedule(routine(5, 0), [
      exercise('00A'),
      exercise('00B'),
    ]);
    expect(
      zeroInterval
        .filter((event) => event.atMs === 8_000)
        .map((event) => event.type),
    ).toEqual(['end', 'start']);
    expect(zeroInterval.slice(-2).map((event) => event.type)).toEqual([
      'end',
      'complete',
    ]);
  });
});
