import { useEffect, useMemo, useState } from 'react';
import { exercises } from '../data/exercises';
import { decodeRoutineHash } from '../domain/routineCodec';
import { Session } from '../components/Session';
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
          <p className="status">ストレッチを始める</p>
          <h2 id="welcome-title">ルーティンURLを開いて始めます</h2>
          <p>
            画像は表示せず、種目と動作の音声案内、カウントダウン音で進めるストレッチです。
          </p>
          <p>
            股関節・もも裏・広背筋の5種目を、音声案内に合わせて行えます。カウントダウン音は下のボタンで確認できます。
          </p>
          <a className="routine-link" href="#/v1/30/10/00D00E00F010011">
            股関節・もも裏・広背筋のメニューを開く
          </a>
        </section>
      ) : result.ok ? (
        <Session
          key={hash}
          routine={result.routine}
          exercises={result.exercises}
        />
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

      {!result?.ok && <AudioCuePreview />}

      <footer>
        <details>
          <summary>このアプリについて</summary>
          <p>音声：VOICEVOX:四国めたん</p>
        </details>
      </footer>
    </main>
  );
}
