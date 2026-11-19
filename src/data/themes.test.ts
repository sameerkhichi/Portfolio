import { describe, expect, it } from 'vitest';
import {
  ACCENT_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  loadSavedThemeId,
} from './themes';

describe('accent themes', () => {
  it('defaults to aqua and resolves unknown IDs safely back to aqua', () => {
    expect(DEFAULT_THEME_ID).toBe('aqua');
    expect(loadSavedThemeId()).toBe('aqua');
    expect(getThemeById('nonexistent').id).toBe('aqua');
    expect(getThemeById('green').name).toBe('Tech Green');
  });

  it('defines valid RGB triplets for every preset theme', () => {
    const rgbPattern = /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/;
    expect(ACCENT_THEMES.length).toBeGreaterThanOrEqual(6);
    for (const theme of ACCENT_THEMES) {
      expect(theme.accentRgb).toMatch(rgbPattern);
      expect(theme.glowRgb).toMatch(rgbPattern);
      expect(theme.secondaryRgb).toMatch(rgbPattern);
      expect(theme.softRgb).toMatch(rgbPattern);
      expect(theme.midRgb).toMatch(rgbPattern);
    }
  });
});
