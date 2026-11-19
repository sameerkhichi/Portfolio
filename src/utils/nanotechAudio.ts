/**
 * Procedural Web Audio API Nanotech Sound Engine.
 *
 * Synthesizes Marvel-inspired metallic trickling / nanobot assembly textures
 * using inharmonic modal partials, resonant bandpass micro-transients,
 * stereo micro-panning, and cascading granular timing — with zero external audio files.
 */

const STORAGE_MUTE_KEY = 'neural_portfolio_audio_muted';
const METALLIC_RATIOS = [1.0, 1.47, 2.09, 2.86, 3.92];

class NanotechAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;
  private lastMovementTickAt = 0;
  private lastHoverAt = 0;

  constructor() {
    this.muted = this.readStoredMute();
  }

  private readStoredMute(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private persistMute(muted: boolean): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_MUTE_KEY, muted ? 'true' : 'false');
    } catch {
      // Ignore storage failures
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.persistMute(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.24, this.ctx.currentTime, 0.02);
    }
  }

  public toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    if (!next) {
      this.unlock();
      this.playNodeFocus();
    }
    return next;
  }

  public unlock(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.12;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.24;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      } catch {
        this.ctx = null;
        return false;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Browser may still require direct user gesture
      });
    }

    return true;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Exponentially weighted crisp click noise
      const env = Math.pow(1 - i / length, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    return buffer;
  }

  private ensureReady(): boolean {
    if (this.muted) return false;
    if (!this.ctx || !this.compressor) {
      if (!this.unlock()) return false;
    }
    if (!this.ctx || !this.compressor) return false;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx.state === 'running';
  }

  /**
   * Schedules a single metallic nanobot micro-clink at `startTime`.
   */
  private scheduleMetallicGrain(options: {
    startTime: number;
    baseFreq: number;
    gain: number;
    decay: number;
    pan?: number;
    bright?: boolean;
  }): void {
    if (!this.ctx || !this.compressor) return;
    const { startTime, baseFreq, gain, decay, pan = 0, bright = true } = options;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(
      Math.min(7200, Math.max(900, baseFreq * (bright ? 1.85 : 1.25))),
      startTime
    );
    filter.Q.setValueAtTime(bright ? 5.5 : 3.2, startTime);

    const panner =
      typeof this.ctx.createStereoPanner === 'function'
        ? this.ctx.createStereoPanner()
        : null;

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), startTime);
      filter.connect(panner);
      panner.connect(this.compressor);
    } else {
      filter.connect(this.compressor);
    }

    // 3 inharmonic metallic partials
    const partials = bright ? [0, 1, 2] : [0, 1];
    for (const idx of partials) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';

      const freq = baseFreq * METALLIC_RATIOS[idx];
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.035, startTime + decay);

      const partialLevel = gain / (idx * 1.35 + 1);
      oscGain.gain.setValueAtTime(0.0001, startTime);
      oscGain.gain.linearRampToValueAtTime(partialLevel, startTime + 0.0018);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + decay + 0.01);
    }

    // Metallic transient snap from resonant filtered noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(2600, startTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(gain * 0.45, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.014);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(filter);

      noise.start(startTime);
      noise.stop(startTime + 0.02);
    }
  }

  /**
   * Subtle low-mid magnetic lock sweep to anchor major zoom transitions.
   */
  private scheduleMagneticSweep(
    startTime: number,
    fromFreq: number,
    toFreq: number,
    duration: number,
    gain: number
  ): void {
    if (!this.ctx || !this.compressor) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(toFreq, startTime + duration);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(g);
    g.connect(this.compressor);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.015);
  }

  /**
   * Played when generating / revealing the full neural network (zooming out of About Me).
   * Produces a shimmering cascading metallic nanotech trickle radiating outward.
   */
  public playAssembleCascade(particleCount = 15): void {
    if (!this.ensureReady() || !this.ctx) return;
    const now = this.ctx.currentTime + 0.01;

    this.scheduleMagneticSweep(now, 240, 118, 0.34, 0.085);

    let offset = 0;
    for (let i = 0; i < particleCount; i++) {
      const progress = i / Math.max(1, particleCount - 1);
      // Slight accelerating-then-settling trickle cadence
      const step = 0.016 + progress * 0.022 + Math.random() * 0.01;
      const baseFreq = 1280 + progress * 1450 + (Math.random() - 0.5) * 260;
      const pan = Math.sin(i * 1.7) * 0.65;
      const gain = (0.12 - progress * 0.045) * (0.85 + Math.random() * 0.3);

      this.scheduleMetallicGrain({
        startTime: now + offset,
        baseFreq,
        gain,
        decay: 0.032 + Math.random() * 0.024,
        pan,
        bright: true,
      });
      offset += step;
    }
  }

  /**
   * Played when zooming into a node/catalog or zooming back out.
   */
  public playZoomTransition(direction: 'in' | 'out'): void {
    if (!this.ensureReady() || !this.ctx) return;
    const now = this.ctx.currentTime + 0.008;
    const grains = 9;

    this.scheduleMagneticSweep(
      now,
      direction === 'in' ? 125 : 230,
      direction === 'in' ? 250 : 120,
      0.24,
      0.075
    );

    let offset = 0;
    for (let i = 0; i < grains; i++) {
      const t = i / (grains - 1);
      const curve = direction === 'in' ? t : 1 - t;
      const baseFreq = 1150 + curve * 1650 + (Math.random() - 0.5) * 180;
      this.scheduleMetallicGrain({
        startTime: now + offset,
        baseFreq,
        gain: 0.095 * (1 - t * 0.35),
        decay: 0.026 + curve * 0.018,
        pan: (direction === 'in' ? 1 : -1) * (t - 0.5) * 0.7,
        bright: true,
      });
      offset += 0.017 + Math.random() * 0.011;
    }
  }

  /**
   * Throttled micro-trickle played as filaments & nodes dynamically draw while
   * panning or zooming through the neural network.
   */
  public playMovementTick(intensity = 0.5, panHint = 0): boolean {
    const nowMs = Date.now();
    const minIntervalMs = Math.max(58, 125 - intensity * 60);
    if (nowMs - this.lastMovementTickAt < minIntervalMs) {
      return false;
    }
    this.lastMovementTickAt = nowMs;

    if (!this.ensureReady() || !this.ctx) return false;
    const now = this.ctx.currentTime + 0.004;
    const clampedIntensity = Math.max(0.15, Math.min(1, intensity));
    const microCount = clampedIntensity > 0.65 ? 3 : 2;

    for (let i = 0; i < microCount; i++) {
      this.scheduleMetallicGrain({
        startTime: now + i * (0.016 + Math.random() * 0.01),
        baseFreq: 1650 + Math.random() * 1400 + i * 210,
        gain: 0.042 * clampedIntensity,
        decay: 0.02 + Math.random() * 0.014,
        pan: panHint + (Math.random() - 0.5) * 0.35,
        bright: true,
      });
    }

    return true;
  }

  /**
   * Crisp metallic harmonic chime when hovering over a node.
   */
  public playNodeHover(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastHoverAt < 90) return;
    this.lastHoverAt = nowMs;

    if (!this.ensureReady() || !this.ctx) return;
    const now = this.ctx.currentTime + 0.003;
    this.scheduleMetallicGrain({
      startTime: now,
      baseFreq: 2180 + (Math.random() - 0.5) * 180,
      gain: 0.055,
      decay: 0.028,
      pan: (Math.random() - 0.5) * 0.25,
      bright: true,
    });
  }

  /**
   * Dual-grain metallic lock ping when focusing a project node (1st click).
   */
  public playNodeFocus(): void {
    if (!this.ensureReady() || !this.ctx) return;
    const now = this.ctx.currentTime + 0.005;

    this.scheduleMetallicGrain({
      startTime: now,
      baseFreq: 1580,
      gain: 0.1,
      decay: 0.045,
      pan: -0.18,
      bright: true,
    });
    this.scheduleMetallicGrain({
      startTime: now + 0.024,
      baseFreq: 2340,
      gain: 0.095,
      decay: 0.055,
      pan: 0.18,
      bright: true,
    });
    this.scheduleMetallicGrain({
      startTime: now + 0.052,
      baseFreq: 3120,
      gain: 0.06,
      decay: 0.04,
      pan: 0,
      bright: true,
    });
  }
}

export const nanotechAudio = new NanotechAudioEngine();
export { NanotechAudioEngine };
