import type { Exercise } from '../data/exercises';
import type { Routine } from '../domain/routineCodec';
import { buildSessionSchedule } from '../domain/sessionSchedule';
import { scheduleCue } from './cueSynth';
import { resumeTimeline, type PlaybackEvent } from './sessionTimeline';

export type Playback = {
  status:
    | 'ready'
    | 'loading'
    | 'preparing'
    | 'exercising'
    | 'interval'
    | 'paused'
    | 'complete'
    | 'error';
  exerciseIndex: number;
  remainingMs: number;
  error?: string;
};

export class SessionPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers: AudioBuffer[] = [];
  private events: PlaybackEvent[] = [];
  private origin = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private scheduled = new Set<string>();
  private delivered = new Set<string>();
  private speechSource: AudioBufferSourceNode | null = null;
  private stops: (() => void)[] = [];
  private pausedMs = 0;
  private wasExercising = false;
  private generation = 0;
  private abort = new AbortController();
  private muted = false;
  private pauseAfterLoad = false;
  private wake: WakeLockSentinel | null = null;
  private state: Playback = {
    status: 'ready',
    exerciseIndex: 0,
    remainingMs: 0,
  };

  constructor(
    private routine: Routine,
    private exercises: Exercise[],
    private update: (state: Playback) => void,
  ) {}

  private emit(patch: Partial<Playback>) {
    this.state = { ...this.state, ...patch };
    this.update(this.state);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gain) this.gain.gain.value = muted ? 0 : 1;
  }

  async start() {
    if (this.state.status !== 'ready' && this.state.status !== 'error') return;
    const generation = ++this.generation;
    this.pauseAfterLoad = false;
    this.emit({ status: 'loading', error: undefined });
    try {
      this.context = new AudioContext();
      const context = this.context;
      this.gain = context.createGain();
      this.gain.connect(context.destination);
      this.setMuted(this.muted);
      await context.resume();
      const buffers = await Promise.all(
        this.exercises.map(async (exercise) => {
          const response = await fetch(exercise.voiceSrc, {
            signal: this.abort.signal,
          });
          if (!response.ok) throw new Error('Missing audio');
          return context.decodeAudioData(await response.arrayBuffer());
        }),
      );
      if (generation !== this.generation) return;
      this.buffers = buffers;
      // The decoded sample duration is authoritative for audible playback.
      this.events = buildSessionSchedule(
        this.routine,
        this.exercises.map((e, i) => ({
          ...e,
          voiceDurationMs:
            (buffers[i]?.duration ?? e.voiceDurationMs / 1000) * 1000,
        })),
      );
      this.emit({ status: 'preparing', exerciseIndex: 0 });
      this.begin();
      this.pauseIfNeeded();
    } catch {
      if (generation !== this.generation) return;
      this.stopAudio();
      this.emit({
        status: 'error',
        error:
          '音声を読み込めませんでした。接続や音声設定を確認して再試行してください。',
      });
      await this.context?.close().catch(() => {
        /* Already released or closed. */
      });
      this.context = null;
    }
  }

  private pauseIfNeeded() {
    if (document.hidden || this.pauseAfterLoad) this.pause();
  }

  private begin() {
    if (!this.context) return;
    this.origin = this.context.currentTime + 0.05;
    this.scheduled.clear();
    this.delivered.clear();
    this.context.onstatechange = () => {
      if (this.context?.state !== 'running' && this.timer) this.pause();
    };
    void this.acquireWake();
    this.timer = setInterval(() => {
      this.tick();
    }, 25);
    this.tick();
  }

  private async acquireWake() {
    if (!('wakeLock' in navigator)) return;
    try {
      const wake = await navigator.wakeLock.request('screen');
      if (!this.timer || document.hidden) await wake.release();
      else {
        await this.wake?.release();
        this.wake = wake;
      }
    } catch {
      /* Screen wake lock is optional. */
    }
  }

  private releaseWake() {
    void this.wake?.release().catch(() => {
      /* Already released or closed. */
    });
    this.wake = null;
  }

  private tick() {
    const context = this.context;
    const gain = this.gain;
    if (!context || !gain) return;
    const now = (context.currentTime - this.origin) * 1000;
    for (const event of this.events) {
      if (event.atMs > now + 100) break;
      if (!this.scheduled.has(event.id)) {
        this.scheduled.add(event.id);
        // Do not burst stale tones after the browser has stalled.
        if (event.atMs >= now - 150) {
          const at = Math.max(
            context.currentTime,
            this.origin + event.atMs / 1000,
          );
          if (event.type === 'announce' || event.type === 'replay') {
            // Superseded instructions must not speak over another instruction.
            this.speechSource?.stop(at);
            const source = context.createBufferSource();
            source.buffer = this.buffers[event.exerciseIndex] ?? null;
            source.connect(gain);
            source.onended = () => {
              source.disconnect();
            };
            source.start(at);
            this.speechSource = source;
            this.stops.push(() => {
              source.stop();
              source.disconnect();
            });
          } else if (event.type !== 'resume') {
            if (event.type === 'complete') this.speechSource?.stop(at);
            const immediateStart =
              event.type === 'end' &&
              this.events.some(
                (e) => e.type === 'start' && e.atMs === event.atMs,
              );
            if (!immediateStart)
              this.stops.push(scheduleCue(context, event.type, at, gain));
          }
        } else if (event.type === 'announce') {
          // Never silently skip instructions when a timer was throttled.
          this.pause();
          this.pausedMs = event.atMs;
          this.wasExercising = false;
          return;
        }
      }
      if (event.atMs > now || this.delivered.has(event.id)) continue;
      this.delivered.add(event.id);
      if (event.type === 'announce' && this.state.status !== 'exercising')
        this.emit({
          status: event.exerciseIndex === 0 ? 'preparing' : 'interval',
          exerciseIndex: event.exerciseIndex,
        });
      if (event.type === 'start' || event.type === 'resume')
        this.emit({ status: 'exercising', exerciseIndex: event.exerciseIndex });
      if (event.type === 'end')
        this.emit({
          status: 'interval',
          exerciseIndex: event.exerciseIndex + 1,
        });
      if (event.type === 'complete') {
        clearInterval(this.timer);
        this.timer = undefined;
        this.releaseWake();
        this.emit({ status: 'complete', remainingMs: 0 });
        return;
      }
    }
    const exercising = this.state.status === 'exercising';
    const boundary = this.events.find(
      (e) =>
        e.atMs > now &&
        (exercising
          ? e.type === 'end' || e.type === 'complete'
          : e.type === 'start' || e.type === 'resume'),
    );
    this.emit({ remainingMs: Math.max(0, (boundary?.atMs ?? now) - now) });
  }

  pause() {
    if (this.state.status === 'loading') {
      this.pauseAfterLoad = true;
      return;
    }
    if (!this.timer || !this.context) return;
    this.pausedMs = Math.max(
      0,
      (this.context.currentTime - this.origin) * 1000,
    );
    this.wasExercising = this.state.status === 'exercising';
    this.stopAudio();
    this.emit({ status: 'paused' });
  }

  async resume() {
    if (this.state.status !== 'paused' || !this.context) return;
    const generation = this.generation;
    this.emit({ status: 'preparing', error: undefined });
    try {
      await this.context.resume();
      if (generation !== this.generation) return;
      this.events = resumeTimeline(
        this.events,
        this.pausedMs,
        this.buffers.map((b) => b.duration * 1000),
        this.wasExercising,
        this.state.exerciseIndex,
      );
      this.begin();
      if (document.hidden) this.pause();
    } catch {
      if (generation === this.generation)
        this.emit({
          status: 'paused',
          error: '再開できませんでした。もう一度お試しください。',
        });
    }
  }

  private stopAudio() {
    clearInterval(this.timer);
    this.timer = undefined;
    for (const stop of this.stops) {
      try {
        stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.stops = [];
    this.speechSource = null;
    this.releaseWake();
  }

  dispose() {
    ++this.generation;
    this.abort.abort();
    this.stopAudio();
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {
        /* Already released or closed. */
      });
    }
    this.context = null;
  }
}
