import { useEffect, useMemo, useState } from 'react';
import { exercises } from '../data/exercises';
import { decodeRoutineHash } from '../domain/routineCodec';
import { buildSessionSchedule } from '../domain/sessionSchedule';
import { AudioCuePreview } from '../components/AudioCuePreview';

export function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const result = useMemo(
    () => (hash ? decodeRoutineHash(hash, exercises) : null),
    [hash],
  );

  return (
    <main className="shell">
      <header className="brand">
        <span aria-hidden="true" className="brand__mark">
          ほ
        </span>
        <div>
          <p className="eyebrow">stretch with audio</p>
          <h1>Hogune</h1>
        </div>
      </header>

      {!result ? (
        <section className="card" aria-labelledby="welcome-title">
          <p className="status">準備中</p>
          <h2 id="welcome-title">ルーティンURLを開いて始めます</h2>
          <p>
            画像は表示せず、種目と動作の音声案内、カウントダウン音で進めるストレッチです。
          </p>
          <p>
            現在はプロトタイプです。音声案内の素材とセッション再生機能は準備中です。カウントダウン音は下のボタンで確認できます。
          </p>
          <code>#/v1/30/5/00A00B00C</code>
        </section>
      ) : result.ok ? (
        <section className="card" aria-labelledby="ready-title">
          <p className="status">準備完了</p>
          <h2 id="ready-title">{result.exercises.length}種目のストレッチ</h2>
          <p>
            1種目 {result.routine.exerciseSeconds}秒・休憩 最低{' '}
            {result.routine.intervalSeconds}秒
          </p>
          <p>
            案内・カウントダウン込みの所要時間：約{' '}
            {Math.ceil(
              (buildSessionSchedule(result.routine, result.exercises).at(-1)
                ?.atMs ?? 0) / 1000,
            )}
            秒。 休憩が短い場合も、音声案内を最後まで聞いてから始めます。
          </p>
          <ol>
            {result.exercises.map((exercise, index) => (
              <li key={`${exercise.id}-${index}`}>
                {exercise.nameJa}
                <p>{exercise.instructionJa}</p>
              </li>
            ))}
          </ol>
          <button type="button" disabled>
            スタート（Phase 2で実装）
          </button>
        </section>
      ) : (
        <section
          className="card card--error"
          aria-labelledby="error-title"
          role="alert"
        >
          <p className="status">URLを確認してください</p>
          <h2 id="error-title">ルーティンを開始できません</h2>
          <p>{result.message}</p>
        </section>
      )}

      <AudioCuePreview />

      <footer>
        <details>
          <summary>このアプリについて</summary>
          <p>音声：VOICEVOX:四国めたん</p>
        </details>
      </footer>
    </main>
  );
}
