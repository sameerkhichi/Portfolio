/**
 * Procedural Web Audio API Nanotech Sound Engine.
 *
 * Synthesizes Marvel-inspired metallic trickling / nanobot assembly textures
 * using inharmonic modal partials, resonant bandpass micro-transients,
 * stereo micro-panning, and cascading granular timing — with zero external audio files.
 */

const STORAGE_MUTE_KEY = 'neural_portfolio_audio_muted';
const METALLIC_RATIOS = [1.0, 1.47, 2.09, 2.86, 3.92];
const MASTER_VOLUME = 0.36;

interface AudioSessionLike {
  type?: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';
}

class NanotechAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;
  private primedSilentBuffer = false;
  private lastResumedAtMs = 0;
  private resumePromise: Promise<void> | null = null;
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
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : MASTER_VOLUME,
        now,
        0.015
      );
    }
  }

  public isRunning(): boolean {
    return this.ctx?.state === 'running';
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

  private primeSilentBuffer(ctx: AudioContext): void {
    if (this.primedSilentBuffer) return;
    try {
      const silentBuf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(ctx.destination);
      src.start(0);
      if (ctx.state === 'running') {
        this.primedSilentBuffer = true;
      }
    } catch {
      // Ignore if context cannot start yet
    }
  }

  private ensureMasterGainLevel(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const target = this.muted ? 0 : MASTER_VOLUME;
    if (Math.abs(this.masterGain.gain.value - target) > 0.01) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(target, ctx.currentTime);
    }
  }

  /**
   * Returns a safe start time offset: if the audio hardware just woke up from
   * cold start, adds a brief 45ms cushion so the first sound isn't swallowed
   * while laptop/Bluetooth/mobile speakers spin up.
   */
  private getSafeStartTime(ctx: AudioContext, baseOffset = 0.008): number {
    const sinceResume = Date.now() - this.lastResumedAtMs;
    const warmup = sinceResume < 110 ? 0.045 : 0;
    return ctx.currentTime + baseOffset + warmup;
  }

  public unlock(): boolean {
    if (typeof window === 'undefined') return false;

    // On iOS Safari 17+, opt into playback audio session so SFX aren't silenced by the ringer switch
    try {
      const nav = navigator as Navigator & { audioSession?: AudioSessionLike };
      if (nav.audioSession && nav.audioSession.type !== 'playback') {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Ignore unsupported audioSession environments
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      try {
        const ctx = new AudioCtx();
        this.ctx = ctx;
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.12;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : MASTER_VOLUME;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(ctx.destination);
        this.noiseBuffer = this.createNoiseBuffer(ctx);

        ctx.addEventListener?.('statechange', () => {
          if (ctx.state === 'running') {
            this.lastResumedAtMs = Date.now();
            this.ensureMasterGainLevel(ctx);
            this.primeSilentBuffer(ctx);
          }
        });

        if (ctx.state === 'running') {
          this.lastResumedAtMs = Date.now();
        }
      } catch {
        this.ctx = null;
        return false;
      }
    }

    const ctx = this.ctx;
    this.ensureMasterGainLevel(ctx);
    this.primeSilentBuffer(ctx);

    if (ctx.state !== 'running') {
      if (!this.resumePromise) {
        this.resumePromise = ctx
          .resume()
          .then(() => {
            if (ctx.state === 'running') {
              this.lastResumedAtMs = Date.now();
              this.ensureMasterGainLevel(ctx);
              this.primeSilentBuffer(ctx);
            }
          })
          .catch(() => {
            // Browser may still require direct user gesture
          })
          .finally(() => {
            this.resumePromise = null;
          });
      }
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

  /**
   * Executes a sound callback once the AudioContext is running.
   *
   * - `createIfMissing = true` (explicit clicks/taps/transitions): unlocks/resumes
   *   and schedules immediately once running (with cold-start DAC warmup cushion).
   * - `createIfMissing = false` (passive hover / movement ticks): never creates a
   *   premature suspended AudioContext before the user's first gesture.
   */
  private withReadyContext(
    callback: (ctx: AudioContext, startTime: number) => void,
    createIfMissing = true
  ): boolean {
    if (this.muted) return false;

    if (!this.ctx || !this.compressor) {
      if (!createIfMissing) return false;
      if (!this.unlock()) return false;
    }
    if (!this.ctx || !this.compressor) return false;

    const ctx = this.ctx;
    this.ensureMasterGainLevel(ctx);

    if (ctx.state === 'running') {
      callback(ctx, this.getSafeStartTime(ctx));
      return true;
    }

    if (!createIfMissing) {
      return false;
    }

    void ctx
      .resume()
      .then(() => {
        if (!this.muted && this.ctx === ctx && ctx.state === 'running') {
          this.lastResumedAtMs = Date.now();
          this.ensureMasterGainLevel(ctx);
          this.primeSilentBuffer(ctx);
          callback(ctx, this.getSafeStartTime(ctx, 0.015));
        }
      })
      .catch(() => {
        // Still waiting for user gesture
      });

    return true;
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
    this.withReadyContext((_ctx, now) => {
      this.scheduleMagneticSweep(now, 240, 118, 0.34, 0.1);

      let offset = 0;
      for (let i = 0; i < particleCount; i++) {
        const progress = i / Math.max(1, particleCount - 1);
        const step = 0.016 + progress * 0.022 + Math.random() * 0.01;
        const baseFreq = 1220 + progress * 1450 + (Math.random() - 0.5) * 260;
        const pan = Math.sin(i * 1.7) * 0.65;
        const gain = (0.14 - progress * 0.05) * (0.85 + Math.random() * 0.3);

        this.scheduleMetallicGrain({
          startTime: now + offset,
          baseFreq,
          gain,
          decay: 0.035 + Math.random() * 0.024,
          pan,
          bright: true,
        });
        offset += step;
      }
    }, true);
  }

  /**
   * Played when zooming into a node/catalog or zooming back out.
   */
  public playZoomTransition(direction: 'in' | 'out'): void {
    this.withReadyContext((_ctx, now) => {
      const grains = 9;

      this.scheduleMagneticSweep(
        now,
        direction === 'in' ? 125 : 230,
        direction === 'in' ? 250 : 120,
        0.24,
        0.09
      );

      let offset = 0;
      for (let i = 0; i < grains; i++) {
        const t = i / (grains - 1);
        const curve = direction === 'in' ? t : 1 - t;
        const baseFreq = 1150 + curve * 1650 + (Math.random() - 0.5) * 180;
        this.scheduleMetallicGrain({
          startTime: now + offset,
          baseFreq,
          gain: 0.11 * (1 - t * 0.35),
          decay: 0.028 + curve * 0.018,
          pan: (direction === 'in' ? 1 : -1) * (t - 0.5) * 0.7,
          bright: true,
        });
        offset += 0.017 + Math.random() * 0.011;
      }
    }, true);
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

    return this.withReadyContext((_ctx, now) => {
      const clampedIntensity = Math.max(0.15, Math.min(1, intensity));
      const microCount = clampedIntensity > 0.65 ? 3 : 2;

      for (let i = 0; i < microCount; i++) {
        this.scheduleMetallicGrain({
          startTime: now + i * (0.016 + Math.random() * 0.01),
          baseFreq: 1550 + Math.random() * 1400 + i * 210,
          gain: 0.058 * clampedIntensity,
          decay: 0.022 + Math.random() * 0.014,
          pan: panHint + (Math.random() - 0.5) * 0.35,
          bright: true,
        });
      }
    }, false);
  }

  /**
   * Crisp metallic harmonic chime when hovering over a node.
   */
  public playNodeHover(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastHoverAt < 90) return;
    this.lastHoverAt = nowMs;

    this.withReadyContext((_ctx, now) => {
      this.scheduleMetallicGrain({
        startTime: now,
        baseFreq: 2180 + (Math.random() - 0.5) * 180,
        gain: 0.068,
        decay: 0.03,
        pan: (Math.random() - 0.5) * 0.25,
        bright: true,
      });
    }, false);
  }

  /**
   * Dual-grain metallic lock ping when focusing a project node (1st click).
   */
  public playNodeFocus(): void {
    this.withReadyContext((_ctx, now) => {
      this.scheduleMetallicGrain({
        startTime: now,
        baseFreq: 1540,
        gain: 0.12,
        decay: 0.048,
        pan: -0.18,
        bright: true,
      });
      this.scheduleMetallicGrain({
        startTime: now + 0.024,
        baseFreq: 2300,
        gain: 0.11,
        decay: 0.056,
        pan: 0.18,
        bright: true,
      });
      this.scheduleMetallicGrain({
        startTime: now + 0.052,
        baseFreq: 3080,
        gain: 0.075,
        decay: 0.042,
        pan: 0,
        bright: true,
      });
    }, true);
  }
}

export const nanotechAudio = new NanotechAudioEngine();
export { NanotechAudioEngine };
