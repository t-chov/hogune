import type { ScheduledEvent } from '../domain/sessionSchedule';

export type PlaybackEvent = Omit<ScheduledEvent, 'type'> & {
  type: ScheduledEvent['type'] | 'resume' | 'replay';
};

/** Build a fresh timeline after a pause, preserving the remaining hold time. */
export function resumeTimeline(
  events: PlaybackEvent[],
  pausedMs: number,
  durations: number[],
  exercising: boolean,
  exerciseIndex: number,
): PlaybackEvent[] {
  const ticks = (start: number): PlaybackEvent[] =>
    [3, 2, 1].map((n) => ({
      id: `resume-countdown-${n}`,
      atMs: start - n * 1000,
      type: 'countdown',
      exerciseIndex,
    }));
  const start = events.find(
    (e) => (e.type === 'start' || e.type === 'resume') && e.atMs > pausedMs,
  );
  // Only the initial preparation waits for speech to finish. On later
  // transitions and holds, replay speech without extending the phase for it.
  if (exercising || start?.exerciseIndex !== 0 || start.type === 'resume') {
    const speech = [...events]
      .reverse()
      .find(
        (e) =>
          (e.type === 'announce' || e.type === 'replay') &&
          e.exerciseIndex === exerciseIndex &&
          e.atMs <= pausedMs &&
          e.atMs + (durations[e.exerciseIndex] ?? 0) > pausedMs,
      );
    const replay: PlaybackEvent[] = speech
      ? [{ ...speech, type: 'replay', atMs: 0 }]
      : [];
    if (exercising) {
      return [
        ...replay,
        ...ticks(3000),
        { id: 'resume', type: 'resume' as const, atMs: 3000, exerciseIndex },
        ...events
          .filter((e) => e.atMs > pausedMs)
          .map((e) => ({ ...e, atMs: e.atMs - pausedMs + 3000 })),
      ].sort((a, b) => a.atMs - b.atMs);
    }
    if (!start) return [];
    const lead = Math.max(3000, start.atMs - pausedMs);
    const pendingSpeech = events
      .filter(
        (e) =>
          e.type === 'announce' && e.atMs > pausedMs && e.atMs < start.atMs,
      )
      .map((e) => ({ ...e, atMs: e.atMs - pausedMs }));
    return [
      ...replay,
      ...pendingSpeech,
      ...ticks(lead),
      ...events
        .filter((e) => e.atMs >= start.atMs)
        .map((e) => ({ ...e, atMs: e.atMs - start.atMs + lead })),
    ].sort((a, b) => a.atMs - b.atMs);
  }
  const announce = events.find(
    (e) => e.type === 'announce' && e.exerciseIndex === start.exerciseIndex,
  );
  const speechEnd = announce
    ? announce.atMs + (durations[start.exerciseIndex] ?? 0)
    : 0;
  const replay = !!announce && pausedMs < speechEnd;
  const wait = Math.max(
    0,
    start.atMs - Math.max(pausedMs, speechEnd + 250) - 3000,
  );
  const gap = !replay && announce ? Math.max(0, speechEnd + 250 - pausedMs) : 0;
  const lead =
    (replay ? (durations[start.exerciseIndex] ?? 0) + 250 : 0) +
    gap +
    wait +
    3000;
  return [
    ...(replay ? [{ ...announce, atMs: 0 }] : []),
    ...ticks(lead).map((e) => ({ ...e, exerciseIndex: start.exerciseIndex })),
    ...events
      .filter((e) => e.atMs >= start.atMs)
      .map((e) => ({ ...e, atMs: e.atMs - start.atMs + lead })),
  ];
}
