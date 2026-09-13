export type Preferences = {
  muted: boolean;
  reducedMotion?: boolean;
};

export const PREFERENCES_KEY = 'hogune:v1:preferences';
export const DEFAULT_PREFERENCES: Preferences = { muted: false };

export function loadPreferences(
  storage: Pick<Storage, 'getItem'> | undefined,
): Preferences {
  if (!storage) return DEFAULT_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(PREFERENCES_KEY) ?? 'null',
    );
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('muted' in parsed) ||
      typeof parsed.muted !== 'boolean'
    ) {
      return DEFAULT_PREFERENCES;
    }
    const reducedMotion =
      'reducedMotion' in parsed && typeof parsed.reducedMotion === 'boolean'
        ? parsed.reducedMotion
        : undefined;
    return reducedMotion === undefined
      ? { muted: parsed.muted }
      : { muted: parsed.muted, reducedMotion };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(
  storage: Pick<Storage, 'setItem'> | undefined,
  preferences: Preferences,
): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage may be unavailable in private browsing; defaults remain usable.
  }
}
