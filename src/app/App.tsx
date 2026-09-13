import { useEffect, useMemo, useState } from 'react';
import { exercises } from '../data/exercises';
import { decodeRoutineHash } from '../domain/routineCodec';

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
          <p className="eyebrow">stretch by URL</p>
          <h1>Hogune</h1>
        </div>
      </header>

      {!result ? (
        <section className="card" aria-labelledby="welcome-title">
          <p className="status">準備中</p>
          <h2 id="welcome-title">ルーティンURLを開いて始めます</h2>
          <p>
            現在はドメイン機能のプロトタイプです。レビュー済みの種目はまだ公開されていません。
          </p>
          <code>#/v1/30/5/00A00B00C</code>
        </section>
      ) : result.ok ? (
        <section className="card" aria-labelledby="ready-title">
          <p className="status">準備完了</p>
          <h2 id="ready-title">{result.exercises.length}種目のストレッチ</h2>
          <p>
            1種目 {result.routine.exerciseSeconds}秒・休憩{' '}
            {result.routine.intervalSeconds}秒
          </p>
          <ol>
            {result.exercises.map((exercise) => (
              <li key={`${exercise.id}-${exercise.nameJa}`}>
                {exercise.nameJa}
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

      <footer>
        <details>
          <summary>このアプリについて</summary>
          <p>音声：VOICEVOX:四国めたん</p>
        </details>
      </footer>
    </main>
  );
}
