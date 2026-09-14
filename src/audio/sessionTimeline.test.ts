import { describe, expect, it } from 'vitest';
import { buildSessionSchedule } from '../domain/sessionSchedule';
import { exercises } from '../data/exercises';
import { resumeTimeline } from './sessionTimeline';

const routine = {
  version: 'v1' as const,
  exerciseSeconds: 10,
  intervalSeconds: 0,
  exerciseIds: ['00D', '00E'],
};
const clips = exercises
  .filter((e) => routine.exerciseIds.includes(e.id))
  .map((e) => ({ ...e, voiceDurationMs: 5000 }));
const events = buildSessionSchedule(routine, clips);

describe('pause and resume timeline', () => {
  it('replays interrupted instructions in full before a fresh countdown', () => {
    const resumed = resumeTimeline(events, 2000, [5000, 5000], false, 0);
    expect(resumed[0]).toMatchObject({ type: 'announce', atMs: 0 });
    expect(resumed.find((e) => e.type === 'countdown')?.atMs).toBe(5250);
    expect(resumed.find((e) => e.type === 'start')?.atMs).toBe(8250);
  });
  it('keeps the silence gap when paused just after speech ends', () => {
    const resumed = resumeTimeline(events, 5100, [5000, 5000], false, 0);
    expect(resumed.find((e) => e.type === 'countdown')?.atMs).toBe(150);
  });
  it('preserves the exact remaining exercise time', () => {
    const resumed = resumeTimeline(events, 12250, [5000, 5000], true, 0);
    expect(resumed.find((e) => e.type === 'resume')?.atMs).toBe(3000);
    expect(resumed.find((e) => e.type === 'end')?.atMs).toBe(9000);
    expect(resumed.find((e) => e.type === 'announce')?.exerciseIndex).toBe(1);
  });
  it('can pause again during the resume countdown without skipping a hold', () => {
    const first = resumeTimeline(events, 12250, [5000, 5000], true, 0);
    const second = resumeTimeline(first, 1000, [5000, 5000], false, 0);
    expect(second.find((e) => e.type === 'resume')?.atMs).toBe(3000);
    expect(second.find((e) => e.type === 'end')?.atMs).toBe(9000);
  });
  it('replaces a partially played start countdown', () => {
    const resumed = resumeTimeline(events, 7000, [5000, 5000], false, 0);
    expect(
      resumed.filter((e) => e.type === 'countdown' && e.atMs < 3000),
    ).toHaveLength(3);
    expect(resumed.find((e) => e.type === 'start')?.atMs).toBe(3000);
    expect(
      resumed.filter((e) => e.type === 'announce').map((e) => e.exerciseIndex),
    ).toEqual([1]);
  });
  it('replays speech that overlaps a hold without losing the remaining hold', () => {
    const resumed = resumeTimeline(events, 20000, [5000, 5000], true, 1);
    expect(resumed[0]).toMatchObject({
      type: 'replay',
      exerciseIndex: 1,
      atMs: 0,
    });
    expect(resumed.find((e) => e.type === 'resume')?.atMs).toBe(3000);
    expect(resumed.at(-1)?.atMs).toBe(11250);
  });
  it('does not lengthen a resumed interval for replayed speech', () => {
    const spaced = buildSessionSchedule(
      { ...routine, intervalSeconds: 10 },
      clips,
    );
    const resumed = resumeTimeline(spaced, 20000, [5000, 25000], false, 1);
    expect(resumed[0]).toMatchObject({ type: 'replay' });
    expect(resumed.find((e) => e.type === 'start')?.atMs).toBe(8250);
  });
  it('announces the next exercise when paused before its announcement', () => {
    const spaced = buildSessionSchedule(
      { ...routine, intervalSeconds: 10 },
      clips,
    );
    const resumed = resumeTimeline(spaced, 18400, [5000, 5000], false, 1);
    expect(resumed[0]).toMatchObject({
      type: 'announce',
      exerciseIndex: 1,
      atMs: 350,
    });
    expect(resumed.at(-1)?.type).toBe('complete');
  });
});
