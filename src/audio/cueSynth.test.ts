import { describe, expect, it, vi } from 'vitest';
import { scheduleCue, type Cue } from './cueSynth';

function audioContext() {
  const oscillators: {
    frequency: { value: number };
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const context = {
    destination: {},
    createOscillator: () => {
      const oscillator = {
        frequency: { value: 0 },
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
  return { context: context as unknown as AudioContext, oscillators };
}

describe('synthesized cues', () => {
  it.each<Cue>(['countdown', 'start', 'end', 'complete'])(
    '%s fits inside the transition gap',
    (cue) => {
      const { context, oscillators } = audioContext();
      scheduleCue(context, cue, 10);
      expect(oscillators.length).toBeGreaterThan(0);
      for (const oscillator of oscillators) {
        expect(oscillator.start.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(10);
        expect(oscillator.stop.mock.calls[0]?.[0]).toBeLessThanOrEqual(10.4);
      }
    },
  );
  it('makes start ascend and end descend', () => {
    for (const cue of ['start', 'end'] as const) {
      const { context, oscillators } = audioContext();
      scheduleCue(context, cue, 0);
      const [first, second] = oscillators;
      if (!first || !second) throw new Error('Expected two notes');
      const difference = second.frequency.value - first.frequency.value;
      expect(cue === 'start' ? difference : -difference).toBeGreaterThan(0);
    }
  });
});
