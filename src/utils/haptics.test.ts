import { describe, expect, it } from 'vitest';
import { triggerHaptic } from './haptics';

describe('triggerHaptic', () => {
  it('safely no-ops in non-browser Node environments', () => {
    expect(triggerHaptic('light')).toBe(false);
    expect(triggerHaptic('medium')).toBe(false);
    expect(triggerHaptic('expand')).toBe(false);
    expect(triggerHaptic('assemble')).toBe(false);
    expect(triggerHaptic('dismiss')).toBe(false);
  });
});
