import type { Exercise } from '../data/exercises';

export const ROUTINE_VERSION = 'v1';
export const EXERCISE_SECONDS_RANGE = { min: 5, max: 600 } as const;
export const INTERVAL_SECONDS_RANGE = { min: 0, max: 120 } as const;
export const EXERCISE_COUNT_RANGE = { min: 1, max: 100 } as const;

export type Routine = {
  version: typeof ROUTINE_VERSION;
  exerciseSeconds: number;
  intervalSeconds: number;
  exerciseIds: string[];
};

export type RoutineDecodeResult =
  | { ok: true; routine: Routine; exercises: Exercise[]; canonicalHash: string }
  | { ok: false; message: string; unknownIds?: string[] };

const integerInRange = (
  value: string,
  min: number,
  max: number,
): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
};

export function decodeRoutineHash(
  hash: string,
  manifest: readonly Exercise[],
): RoutineDecodeResult {
  const match = /^#\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(hash);
  if (!match)
    return { ok: false, message: 'ルーティンURLの形式が正しくありません。' };

  const [, version, exerciseRaw, intervalRaw, idsRaw] = match;
  if (version !== ROUTINE_VERSION) {
    return {
      ok: false,
      message: `未対応のルーティン形式です（${version ?? ''}）。`,
    };
  }

  const exerciseSeconds = integerInRange(
    exerciseRaw ?? '',
    EXERCISE_SECONDS_RANGE.min,
    EXERCISE_SECONDS_RANGE.max,
  );
  if (exerciseSeconds === null) {
    return {
      ok: false,
      message: '運動時間は5〜600秒の整数で指定してください。',
    };
  }

  const intervalSeconds = integerInRange(
    intervalRaw ?? '',
    INTERVAL_SECONDS_RANGE.min,
    INTERVAL_SECONDS_RANGE.max,
  );
  if (intervalSeconds === null) {
    return {
      ok: false,
      message: '休憩時間は0〜120秒の整数で指定してください。',
    };
  }

  if (!/^[0-9a-fA-F]+$/.test(idsRaw ?? '') || (idsRaw?.length ?? 0) % 3 !== 0) {
    return {
      ok: false,
      message: '種目IDは3桁の16進数を連結して指定してください。',
    };
  }

  const canonicalIds = (idsRaw?.toUpperCase().match(/.{3}/g) ?? []) as string[];
  if (
    canonicalIds.length < EXERCISE_COUNT_RANGE.min ||
    canonicalIds.length > EXERCISE_COUNT_RANGE.max
  ) {
    return { ok: false, message: '種目数は1〜100件で指定してください。' };
  }

  const enabledById = new Map(
    manifest.filter((item) => item.enabled).map((item) => [item.id, item]),
  );
  const unknownIds = [
    ...new Set(canonicalIds.filter((id) => !enabledById.has(id))),
  ];
  if (unknownIds.length > 0) {
    return {
      ok: false,
      message: `利用できない種目IDがあります: ${unknownIds.join(', ')}`,
      unknownIds,
    };
  }

  const routine: Routine = {
    version: ROUTINE_VERSION,
    exerciseSeconds,
    intervalSeconds,
    exerciseIds: canonicalIds,
  };
  return {
    ok: true,
    routine,
    exercises: canonicalIds.map((id) => {
      const exercise = enabledById.get(id);
      if (!exercise) throw new Error(`Validated exercise ${id} is missing`);
      return exercise;
    }),
    canonicalHash: encodeRoutineHash(routine),
  };
}

export function encodeRoutineHash(routine: Omit<Routine, 'version'>): string {
  const { exerciseSeconds, intervalSeconds, exerciseIds } = routine;
  if (
    !Number.isInteger(exerciseSeconds) ||
    exerciseSeconds < EXERCISE_SECONDS_RANGE.min ||
    exerciseSeconds > EXERCISE_SECONDS_RANGE.max
  ) {
    throw new RangeError('exerciseSeconds is outside the supported range');
  }
  if (
    !Number.isInteger(intervalSeconds) ||
    intervalSeconds < INTERVAL_SECONDS_RANGE.min ||
    intervalSeconds > INTERVAL_SECONDS_RANGE.max
  ) {
    throw new RangeError('intervalSeconds is outside the supported range');
  }
  if (
    exerciseIds.length < EXERCISE_COUNT_RANGE.min ||
    exerciseIds.length > EXERCISE_COUNT_RANGE.max ||
    exerciseIds.some((id) => !/^[0-9a-fA-F]{3}$/.test(id))
  ) {
    throw new RangeError(
      'exerciseIds must contain 1–100 three-digit hexadecimal IDs',
    );
  }
  return `#/${ROUTINE_VERSION}/${exerciseSeconds}/${intervalSeconds}/${exerciseIds
    .map((id) => id.toUpperCase())
    .join('')}`;
}
