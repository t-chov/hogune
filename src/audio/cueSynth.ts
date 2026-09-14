export type Cue = 'countdown' | 'start' | 'end' | 'complete';

/** All cues finish within 400 ms, before the scheduler's speech gap. */
export function scheduleCue(context: AudioContext, cue: Cue, at: number): void {
  const notes: Record<Cue, number[]> = {
    countdown: [660],
    start: [660, 880],
    end: [660, 440],
    complete: [523.25, 659.25, 783.99],
  };
  notes[cue].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = at + index * 0.13;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.linearRampToValueAtTime(0, start + 0.11);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + 0.12);
  });
}
