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

export function buildSessionSchedule(
  routine: Routine,
  resolvedExercises: readonly Exercise[],
): ScheduledEvent[] {
  if (resolvedExercises.length !== routine.exerciseIds.length) {
    throw new Error('Resolved exercise count does not match the routine');
  }

  const events: ScheduledEvent[] = [
    { id: 'announce-0', atMs: 0, type: 'announce', exerciseIndex: 0 },
    ...countdownEvents('prepare', 0, 0),
    { id: 'start-0', atMs: COUNTDOWN_MS, type: 'start', exerciseIndex: 0 },
  ];
  let exerciseStartMs = COUNTDOWN_MS;

  for (let index = 0; index < resolvedExercises.length; index += 1) {
    const exerciseEndMs = exerciseStartMs + routine.exerciseSeconds * 1_000;
    for (let second = 3; second >= 1; second -= 1) {
      const atMs = exerciseEndMs - second * 1_000;
      if (atMs >= exerciseStartMs) {
        events.push({
          id: `end-countdown-${index}-${second}`,
          atMs,
          type: 'countdown',
          exerciseIndex: index,
        });
      }
    }
    events.push({
      id: `end-${index}`,
      atMs: exerciseEndMs,
      type: 'end',
      exerciseIndex: index,
    });

    const nextIndex = index + 1;
    if (nextIndex >= resolvedExercises.length) {
      events.push({
        id: 'complete',
        atMs: exerciseEndMs,
        type: 'complete',
        exerciseIndex: index,
      });
      break;
    }

    const nextStartMs = exerciseEndMs + routine.intervalSeconds * 1_000;
    const countdownStartMs = nextStartMs - COUNTDOWN_MS;
    const nextExercise = resolvedExercises[nextIndex];
    if (!nextExercise) throw new Error('Missing resolved exercise');
    const latestAnnouncementMs =
      countdownStartMs - SPEECH_GAP_MS - nextExercise.voiceDurationMs;
    const earliestSafeMs = exerciseStartMs;
    if (latestAnnouncementMs >= earliestSafeMs) {
      events.push({
        id: `announce-${nextIndex}`,
        atMs: latestAnnouncementMs,
        type: 'announce',
        exerciseIndex: nextIndex,
      });
    }
    for (let second = 3; second >= 1; second -= 1) {
      const atMs = nextStartMs - second * 1_000;
      if (atMs >= exerciseEndMs) {
        events.push({
          id: `start-countdown-${nextIndex}-${second}`,
          atMs,
          type: 'countdown',
          exerciseIndex: nextIndex,
        });
      }
    }
    events.push({
      id: `start-${nextIndex}`,
      atMs: nextStartMs,
      type: 'start',
      exerciseIndex: nextIndex,
    });
    exerciseStartMs = nextStartMs;
  }

  const eventOrder: Record<ScheduledEvent['type'], number> = {
    announce: 0,
    countdown: 1,
    end: 2,
    start: 3,
    complete: 4,
  };
  return events.sort(
    (a, b) =>
      a.atMs - b.atMs ||
      eventOrder[a.type] - eventOrder[b.type] ||
      a.id.localeCompare(b.id),
  );
}

function countdownEvents(
  prefix: string,
  startMs: number,
  exerciseIndex: number,
): ScheduledEvent[] {
  return [3, 2, 1].map((second, index) => ({
    id: `${prefix}-countdown-${second}`,
    atMs: startMs + index * 1_000,
    type: 'countdown' as const,
    exerciseIndex,
  }));
}
