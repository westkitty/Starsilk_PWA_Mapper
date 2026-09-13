/**
 * Web Audio Local Synthesizer for Tactile System Audio.
 * 
 * Invariants:
 * - OFF by default. Does not autoplay before user interaction.
 * - Generates all sound effects dynamically via native Web Audio API oscillators and gain nodes.
 * - No external sound assets or bandwidth required.
 */

export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  public isEnabled: boolean = false;

  private getContext(): AudioContext | null {
    if (!this.isEnabled) return null;
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.5;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getWaveformData(outputArray?: Uint8Array): Uint8Array | null {
    if (!this.analyser) return null;
    const arr = outputArray || new Uint8Array(this.analyser.fftSize);
    (this.analyser as any).getByteTimeDomainData(arr);
    return arr;
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (this.isEnabled) {
      this.getContext();
      this.playTick();
    }
    return this.isEnabled;
  }

  public playTick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  }

  public playOrbitLock(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // Harmonic dual triad (440Hz and 660Hz)
    const freqs = [523.25, 659.25, 783.99]; // C-major chord chime
    const now = ctx.currentTime;

    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);

      gain.gain.setValueAtTime(0.05, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + 0.4 + i * 0.04);
    }
  }

  public playResonance(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4 warm bell
    osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  public playCollisionWarning(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(65, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  public playStarCollapse(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // Deep sub-bass descending drone with sudden cutoff
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.0, ctx.currentTime + 1.2); // Sudden void cutoff

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.25);
  }

  /**
   * ASSET12: Slingshot whoosh sound (frequency sweep + stereo filter).
   */
  public playSlingshotWhoosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  /**
   * ASSET12: Heavy collision impact thud.
   */
  public playImpactThud(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }

  /**
   * ASSET12: Syzygy alignment celestial chime.
   */
  public playSyzygyChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [880, 1108.73, 1318.51, 1760]; // High sparkling A-major chime
    const now = ctx.currentTime;

    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now + i * 0.05);

      gain.gain.setValueAtTime(0.04, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + 0.85 + i * 0.05);
    }
  }

  /**
   * ASSET12: Warp transition audio sweep.
   */
  public playWarpJump(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  }
}

export const audioSynth = new AudioSynthesizer();
