/**
 * Master Audio Graph & Dynamic Compressor/Limiter.
 * Manages audio routing nodes, multi-channel gain, dynamics compression,
 * and peak limiting to prevent digital clipping distortion.
 */

export class MasterAudioGraph {
  private ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  public ambientGain: GainNode | null = null;
  public limiter: DynamicsCompressorNode | null = null;
  private isInitialized = false;

  public init(context: AudioContext): void {
    if (this.isInitialized && this.ctx === context) return;
    this.ctx = context;

    // Peak Limiter / Brickwall Compressor
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime); // -1 dB
    this.limiter.knee.setValueAtTime(0, this.ctx.currentTime); // hard knee
    this.limiter.ratio.setValueAtTime(20.0, this.ctx.currentTime); // brickwall ratio
    this.limiter.attack.setValueAtTime(0.001, this.ctx.currentTime); // 1ms
    this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime); // 100ms

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Sub-buses
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.6, this.ctx.currentTime);

    // Route: sfx/ambient -> masterGain -> limiter -> destination
    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  public setMasterVolume(vol: number): void {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setSfxVolume(vol: number): void {
    if (!this.sfxGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.sfxGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setAmbientVolume(vol: number): void {
    if (!this.ambientGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.ambientGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }
}

export const masterAudioGraph = new MasterAudioGraph();
