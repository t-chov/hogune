import type { Exercise } from '../data/exercises';
import type { Routine } from './routineCodec';

export type ScheduledEvent = {
  id: string;
  atMs: number;
  type: 'announce' | 'countdown' | 'start' | 'end' | 'complete';
  exerciseIndex: number;
};

const COUNTDOWN_MS = 3_000;
const SPEECH_GAP_MS = 250;
// Transition cues last at most 400 ms; leave silence before instructions.
const TRANSITION_GAP_MS = 500;

/** Intervals are exact; transition speech may continue into the next hold. */
export function buildSessionSchedule(
  routine: Routine,
  resolvedExercises: readonly Exercise[],
): ScheduledEvent[] {
  if (
    resolvedExercises.length === 0 ||
    resolvedExercises.length !== routine.exerciseIds.length
  ) {
    throw new Error('Resolved exercise count does not match the routine');
  }

  const events: ScheduledEvent[] = [];
  let previousEndMs = 0;

  resolvedExercises.forEach((exercise, index) => {
    if (
      !Number.isFinite(exercise.voiceDurationMs) ||
      exercise.voiceDurationMs <= 0
    ) {
      throw new Error('Voice duration must be a positive finite number');
    }
    const announcementMs =
      previousEndMs + (index === 0 ? 0 : TRANSITION_GAP_MS);
    const startMs =
      index === 0
        ? announcementMs +
          exercise.voiceDurationMs +
          SPEECH_GAP_MS +
          COUNTDOWN_MS
        : previousEndMs + routine.intervalSeconds * 1_000;
    events.push({
      id: `announce-${index}`,
      atMs: announcementMs,
      type: 'announce',
      exerciseIndex: index,
    });
    for (const second of [3, 2, 1]) {
      if (index > 0 && startMs - second * 1000 < previousEndMs) continue;
      events.push({
        id: `start-countdown-${index}-${second}`,
        atMs: startMs - second * 1_000,
        type: 'countdown',
        exerciseIndex: index,
      });
    }
    events.push({
      id: `start-${index}`,
      atMs: startMs,
      type: 'start',
      exerciseIndex: index,
    });
    const endMs = startMs + routine.exerciseSeconds * 1_000;
    for (const second of [3, 2, 1]) {
      events.push({
        id: `end-countdown-${index}-${second}`,
        atMs: endMs - second * 1_000,
        type: 'countdown',
        exerciseIndex: index,
      });
    }
    // The completion cue replaces the final end cue so tones never overlap.
    const isLast = index === resolvedExercises.length - 1;
    events.push({
      id: isLast ? 'complete' : `end-${index}`,
      atMs: endMs,
      type: isLast ? 'complete' : 'end',
      exerciseIndex: index,
    });
    previousEndMs = endMs;
  });
  return events.sort((a, b) => a.atMs - b.atMs);
}
