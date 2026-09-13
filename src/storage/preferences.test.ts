import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, loadPreferences } from './preferences';

describe('preferences', () => {
  it('falls back when storage is corrupted', () => {
    expect(loadPreferences({ getItem: () => '{broken' })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('loads only supported values', () => {
    expect(
      loadPreferences({ getItem: () => '{"muted":true,"tracking":true}' }),
    ).toEqual({ muted: true });
  });
});
