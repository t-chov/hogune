import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../data/exercises';
import type { Routine } from '../domain/routineCodec';
import { buildSessionSchedule } from '../domain/sessionSchedule';
import { SessionPlayer, type Playback } from '../audio/sessionPlayer';
import { loadPreferences, savePreferences } from '../storage/preferences';

export function Session({
  routine,
  exercises,
}: {
  routine: Routine;
  exercises: Exercise[];
}) {
  const player = useRef<SessionPlayer | null>(null);
  const [state, setState] = useState<Playback>({
    status: 'ready',
    exerciseIndex: 0,
    remainingMs: 0,
  });
  const [muted, setMuted] = useState(() => {
    try {
      return loadPreferences(window.localStorage).muted;
    } catch {
      return false;
    }
  });
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => {
    const current = new SessionPlayer(routine, exercises, setState);
    player.current = current;
    const visibility = () => {
      if (document.hidden) player.current?.pause();
    };
    const pageHide = () => {
      player.current?.pause();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      player.current?.dispose();
      player.current = null;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
    };
  }, [routine, exercises]);
  useEffect(() => {
    player.current?.setMuted(muted);
    try {
      savePreferences(window.localStorage, { muted });
    } catch {
      /* Storage unavailable. */
    }
  }, [muted]);

  const reset = () => {
    player.current?.dispose();
    player.current = new SessionPlayer(routine, exercises, setState);
    player.current.setMuted(muted);
    setState({ status: 'ready', exerciseIndex: 0, remainingMs: 0 });
    setConfirmEnd(false);
  };
  const current = exercises[state.exerciseIndex];
  const total = Math.ceil(
    (buildSessionSchedule(routine, exercises).at(-1)?.atMs ?? 0) / 1000,
  );
  const ready = state.status === 'ready' || state.status === 'error';
  const active = ['preparing', 'interval', 'exercising', 'paused'].includes(
    state.status,
  );
  const waiting = state.status === 'preparing' || state.status === 'interval';
  const labels = {
    ready: '準備完了',
    loading: '音声を読み込み中',
    preparing: '準備・音声案内',
    exercising: 'ストレッチ',
    interval: '休憩・次の種目の準備',
    paused: '一時停止中',
    complete: '完了',
    error: '音声を確認してください',
  };
  return (
    <section className="card session" aria-labelledby="session-title">
      <p className="status" role="status">
        {labels[state.status]}
      </p>
      <h2 id="session-title">
        {ready
          ? `${exercises.length}種目のストレッチ`
          : state.status === 'complete'
            ? 'おつかれさまでした'
            : current?.nameJa}
      </h2>
      {ready && (
        <>
          <p>
            1種目 {routine.exerciseSeconds}秒・休憩
            {routine.intervalSeconds}秒。案内・カウントダウン込み：約{total}秒。
          </p>
          <p>
            休憩は指定した秒数です。音声案内は次のストレッチ中も続くことがあります。軽く体を温めてから、痛みのない範囲で行ってください。
          </p>
          <ol>
            {exercises.map((e, i) => (
              <li key={`${e.id}-${i}`}>
                {e.nameJa}
                <p>{e.instructionJa}</p>
              </li>
            ))}
          </ol>
          <button onClick={() => void player.current?.start()}>スタート</button>
        </>
      )}
      {state.status === 'loading' && (
        <p>すべての音声の読み込みが終わると案内が始まります。</p>
      )}
      {active && (
        <>
          <p>
            {state.exerciseIndex + 1} / {exercises.length} 種目
          </p>
          <div
            className={`timer${waiting ? ' timer--waiting' : ''}`}
            role="timer"
            aria-label={waiting ? 'ストレッチ開始までの秒数' : '残り秒数'}
          >
            {waiting && (
              <span className="timer__label">ストレッチ開始まで</span>
            )}
            {Math.ceil(state.remainingMs / 1000)}
            <span>秒</span>
          </div>
          <p>{current?.instructionJa}</p>
          {state.exerciseIndex + 1 < exercises.length && (
            <p>次：{exercises[state.exerciseIndex + 1]?.nameJa}</p>
          )}
          {state.status === 'paused' ? (
            <button
              disabled={confirmEnd}
              onClick={() => void player.current?.resume()}
            >
              再開
            </button>
          ) : (
            <button onClick={() => player.current?.pause()}>一時停止</button>
          )}
        </>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.status !== 'complete' && (
        <button
          className="secondary"
          aria-pressed={muted}
          onClick={() => {
            setMuted(!muted);
          }}
        >
          {muted ? '音声をオンにする' : 'ミュートする'}
        </button>
      )}
      {(active || state.status === 'loading') && !confirmEnd && (
        <button
          className="secondary"
          onClick={() => {
            player.current?.pause();
            setConfirmEnd(true);
          }}
        >
          セッションを終了
        </button>
      )}
      {confirmEnd && (
        <div role="group" aria-label="終了の確認">
          <p>セッションを終了しますか？</p>
          <button onClick={reset}>終了する</button>
          <button
            className="secondary"
            onClick={() => {
              setConfirmEnd(false);
            }}
          >
            戻る
          </button>
        </div>
      )}
      {state.status === 'complete' && <button onClick={reset}>もう一度</button>}
      <p className="hint">
        画面を離れると自動で一時停止します。再開時は3秒のカウントダウンが入り、途中の音声案内は最初から再生します。
      </p>
    </section>
  );
}
