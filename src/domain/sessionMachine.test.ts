import { describe, expect, it } from 'vitest';
import { reduceSession, type SessionState } from './sessionMachine';

describe('session state machine', () => {
  it('runs a one-exercise session to completion exactly once', () => {
    let state: SessionState = { status: 'loading' };
    state = reduceSession(state, { type: 'VALIDATED', valid: true });
    state = reduceSession(state, { type: 'START' });
    state = reduceSession(state, { type: 'PREPARATION_FINISHED' });
    state = reduceSession(state, {
      type: 'PHASE_FINISHED',
      exerciseCount: 1,
      intervalSeconds: 5,
    });
    expect(state).toEqual({ status: 'complete' });
    expect(
      reduceSession(state, {
        type: 'PHASE_FINISHED',
        exerciseCount: 1,
        intervalSeconds: 5,
      }),
    ).toEqual({ status: 'complete' });
  });

  it.each([0, 1, 3, 5, 120])(
    'transitions through a %d-second interval',
    (intervalSeconds) => {
      const exercising: SessionState = {
        status: 'exercising',
        exerciseIndex: 0,
      };
      const interval = reduceSession(exercising, {
        type: 'PHASE_FINISHED',
        exerciseCount: 2,
        intervalSeconds,
      });
      expect(interval).toEqual({ status: 'interval', exerciseIndex: 0 });
      expect(
        reduceSession(interval, {
          type: 'PHASE_FINISHED',
          exerciseCount: 2,
          intervalSeconds,
        }),
      ).toEqual({ status: 'exercising', exerciseIndex: 1 });
    },
  );

  it('keeps time for instructions even when the requested rest is zero', () => {
    expect(
      reduceSession(
        { status: 'exercising', exerciseIndex: 0 },
        { type: 'PHASE_FINISHED', exerciseCount: 2, intervalSeconds: 0 },
      ),
    ).toEqual({ status: 'interval', exerciseIndex: 0 });
  });

  it('pauses and returns through a resume countdown', () => {
    const paused = reduceSession(
      { status: 'exercising', exerciseIndex: 1 },
      { type: 'PAUSE' },
    );
    expect(paused).toMatchObject({
      status: 'paused',
      resumeTarget: 'exercising',
      isResumeCountdown: false,
    });
    const countingDown = reduceSession(paused, { type: 'RESUME' });
    expect(countingDown).toMatchObject({
      status: 'paused',
      isResumeCountdown: true,
    });
    expect(
      reduceSession(countingDown, { type: 'RESUME_COUNTDOWN_FINISHED' }),
    ).toEqual({ status: 'exercising', exerciseIndex: 1 });
  });
});
