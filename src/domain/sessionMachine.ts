export type ActiveSessionState = 'preparing' | 'exercising' | 'interval';
export type SessionState =
  | { status: 'loading' | 'invalid' | 'ready' | 'complete' }
  | { status: ActiveSessionState; exerciseIndex: number }
  | {
      status: 'paused';
      exerciseIndex: number;
      resumeTarget: ActiveSessionState;
      isResumeCountdown: boolean;
    };

export type SessionEvent =
  | { type: 'VALIDATED'; valid: boolean }
  | { type: 'START' }
  | { type: 'PREPARATION_FINISHED' }
  | { type: 'PHASE_FINISHED'; exerciseCount: number; intervalSeconds: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESUME_COUNTDOWN_FINISHED' }
  | { type: 'RESET' };

export function reduceSession(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  if (event.type === 'RESET') return { status: 'ready' };
  if (state.status === 'loading' && event.type === 'VALIDATED') {
    return { status: event.valid ? 'ready' : 'invalid' };
  }
  if (state.status === 'ready' && event.type === 'START') {
    return { status: 'preparing', exerciseIndex: 0 };
  }
  if (state.status === 'preparing' && event.type === 'PREPARATION_FINISHED') {
    return { status: 'exercising', exerciseIndex: state.exerciseIndex };
  }
  if (state.status === 'exercising' && event.type === 'PHASE_FINISHED') {
    if (state.exerciseIndex + 1 >= event.exerciseCount)
      return { status: 'complete' };
    // A zero-second interval transitions immediately; speech may follow the start.
    return { status: 'interval', exerciseIndex: state.exerciseIndex };
  }
  if (state.status === 'interval' && event.type === 'PHASE_FINISHED') {
    return { status: 'exercising', exerciseIndex: state.exerciseIndex + 1 };
  }
  if (
    (state.status === 'preparing' ||
      state.status === 'exercising' ||
      state.status === 'interval') &&
    event.type === 'PAUSE'
  ) {
    return {
      status: 'paused',
      exerciseIndex: state.exerciseIndex,
      resumeTarget: state.status,
      isResumeCountdown: false,
    };
  }
  if (state.status === 'paused' && event.type === 'RESUME') {
    return { ...state, isResumeCountdown: true };
  }
  if (
    state.status === 'paused' &&
    state.isResumeCountdown &&
    event.type === 'RESUME_COUNTDOWN_FINISHED'
  ) {
    return { status: state.resumeTarget, exerciseIndex: state.exerciseIndex };
  }
  return state;
}
