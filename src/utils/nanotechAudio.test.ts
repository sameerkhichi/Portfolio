import { describe, expect, it } from 'vitest';
import { NanotechAudioEngine } from './nanotechAudio';

describe('NanotechAudioEngine', () => {
  it('safely no-ops in non-browser environments without Web Audio API', () => {
    const engine = new NanotechAudioEngine();
    expect(engine.unlock()).toBe(false);
    expect(() => engine.playAssembleCascade()).not.toThrow();
    expect(() => engine.playZoomTransition('in')).not.toThrow();
    expect(() => engine.playZoomTransition('out')).not.toThrow();
    expect(() => engine.playNodeHover()).not.toThrow();
    expect(() => engine.playNodeFocus()).not.toThrow();
    expect(engine.playMovementTick(0.8)).toBe(false);
  });

  it('toggles and tracks mute state cleanly', () => {
    const engine = new NanotechAudioEngine();
    expect(engine.isMuted()).toBe(false);
    engine.setMuted(true);
    expect(engine.isMuted()).toBe(true);
    const next = engine.toggleMute();
    expect(next).toBe(false);
    expect(engine.isMuted()).toBe(false);
  });
});
