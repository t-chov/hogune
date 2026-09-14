import { useEffect, useRef, useState } from 'react';
import { scheduleCue } from '../audio/cueSynth';

export function AudioCuePreview() {
  const contextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stop = () => {
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== 'closed')
        void context.close().catch(() => {
          /* Already stopped by the browser. */
        });
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
        setPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const preview = async () => {
    if (contextRef.current) return;
    setError('');
    setPlaying(true);
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (contextRef.current !== context) return;
      const start = context.currentTime + 0.05;
      for (const second of [0, 1, 2])
        scheduleCue(context, 'countdown', start + second);
      scheduleCue(context, 'start', start + 3);
      scheduleCue(context, 'end', start + 4);
      scheduleCue(context, 'complete', start + 5);
      // Use an audio-clock sentinel instead of a wall-clock timer for cleanup.
      const sentinel = context.createBufferSource();
      sentinel.buffer = context.createBuffer(1, 1, context.sampleRate);
      const current = context;
      sentinel.onended = () => {
        if (contextRef.current !== current) return;
        contextRef.current = null;
        setPlaying(false);
        void current.close().catch(() => {
          /* Already stopped by the browser. */
        });
      };
      sentinel.connect(context.destination);
      sentinel.start(start + 5.5);
    } catch {
      if (context && contextRef.current !== context) return;
      contextRef.current = null;
      if (context && context.state !== 'closed')
        void context.close().catch(() => {
          /* Already stopped by the browser. */
        });
      setPlaying(false);
      setError(
        '音を再生できませんでした。ブラウザの音声設定を確認して再度お試しください。',
      );
    }
  };

  return (
    <section className="card" aria-labelledby="audio-title">
      <h2 id="audio-title">カウントダウン音を確認</h2>
      <p>
        3回のカウントダウン → 開始音 → 終了音 →
        完了音の順に鳴ります。端末のメディア音量を調整してください。
      </p>
      <button type="button" disabled={playing} onClick={() => void preview()}>
        {playing ? '確認音を再生中' : '音を試す'}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
