import { describe, expect, it } from 'vitest';
import type { Exercise } from '../data/exercises';
import type { Routine } from './routineCodec';
import { buildSessionSchedule } from './sessionSchedule';

const exercise = (id: string, voiceDurationMs = 1_000): Exercise => ({
  id,
  nameJa: id,
  instructionJa: '動作の説明',
  voiceTextJa: `次は、${id}。動作の説明`,
  voiceSrc: '',
  voiceDurationMs,
  enabled: true,
  review: {
    instructionReviewed: true,
    audioReviewed: true,
    reviewedAt: '2026-09-14',
    reviewer: 'test',
  },
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

describe('audio-first session schedule', () => {
  it.each([5, 600])(
    'preserves %d seconds of exercise and includes preparation in total time',
    (seconds) => {
      const events = buildSessionSchedule(routine(seconds, 5), [
        exercise('00A'),
        exercise('00B'),
      ]);
      expect(events.at(-1)).toMatchObject({
        type: 'complete',
        atMs: 4_250 + seconds * 2_000 + 5_000,
      });
      expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
      expect(events.map((event) => event.atMs)).toEqual(
        events.map((event) => event.atMs).sort((a, b) => a - b),
      );
    },
  );

  it.each([0, 1, 3, 5, 10, 120])(
    'preserves an exact %d-second rest even with long speech',
    (interval) => {
      const events = buildSessionSchedule(routine(30, interval), [
        exercise('00A', 8000),
        exercise('00B', 25000),
      ]);
      const end = events.find((event) => event.id === 'end-0');
      const announce = events.find((event) => event.id === 'announce-1');
      const start = events.find((event) => event.id === 'start-1');
      if (!end || !announce || !start) throw new Error('Missing transition');
      expect(announce.atMs).toBe(end.atMs + 500);
      expect(start.atMs - end.atMs).toBe(interval * 1000);
      if (interval < 25)
        expect(announce.atMs + 25000).toBeGreaterThan(start.atMs);
      const ticks = events.filter((e) => e.id.startsWith('start-countdown-1-'));
      expect(ticks).toHaveLength(Math.min(3, interval));
      expect(ticks.every((e) => e.atMs >= end.atMs)).toBe(true);
      expect(events.map((e) => e.atMs)).toEqual(
        events.map((e) => e.atMs).sort((a, b) => a - b),
      );
    },
  );

  it('uses only the completion cue at the end of a single exercise', () => {
    const events = buildSessionSchedule(
      { ...routine(5, 0), exerciseIds: ['00A'] },
      [exercise('00A')],
    );
    expect(
      events
        .filter((event) => event.atMs === events.at(-1)?.atMs)
        .map((event) => event.type),
    ).toEqual(['complete']);
    expect(events.filter((event) => event.type === 'countdown')).toHaveLength(
      6,
    );
  });

  it('announces repeated exercises separately', () => {
    const events = buildSessionSchedule(
      { ...routine(5, 0), exerciseIds: ['00A', '00A'] },
      [exercise('00A'), exercise('00A')],
    );
    expect(
      events
        .filter((event) => event.type === 'announce')
        .map((event) => event.id),
    ).toEqual(['announce-0', 'announce-1']);
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid measured voice duration %s',
    (duration) => {
      expect(() =>
        buildSessionSchedule(routine(5, 0), [
          exercise('00A', duration),
          exercise('00B'),
        ]),
      ).toThrow('Voice duration');
    },
  );

  it('rejects empty and mismatched exercise lists', () => {
    expect(() => buildSessionSchedule(routine(5, 0), [])).toThrow();
    expect(() =>
      buildSessionSchedule({ ...routine(5, 0), exerciseIds: [] }, []),
    ).toThrow();
  });
});
