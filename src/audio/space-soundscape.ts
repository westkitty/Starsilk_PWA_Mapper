/**
 * Ambient Space Soundscape Generator.
 * Creates an immersive generative cosmic drone with low sub-bass hum and celestial white-noise wash.
 */

export class SpaceSoundscape {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private isRunning = false;

  public start(ctx: AudioContext, destination?: AudioNode): void {
    if (this.isRunning) return;
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 3);

    const target = destination || ctx.destination;
    this.masterGain.connect(target);

    // Deep sub-bass hum (55 Hz - A1)
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(55, ctx.currentTime);

    // Detuned second harmonic (110.5 Hz)
    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(110.5, ctx.currentTime);

    const oscGain1 = ctx.createGain();
    oscGain1.gain.setValueAtTime(0.4, ctx.currentTime);
    this.osc1.connect(oscGain1);
    oscGain1.connect(this.masterGain);

    const oscGain2 = ctx.createGain();
    oscGain2.gain.setValueAtTime(0.15, ctx.currentTime);
    this.osc2.connect(oscGain2);
    oscGain2.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.isRunning = true;
  }

  public stop(): void {
    if (!this.isRunning || !this.ctx || !this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1);
    setTimeout(() => {
      this.osc1?.stop();
      this.osc2?.stop();
      this.osc1?.disconnect();
      this.osc2?.disconnect();
      this.masterGain?.disconnect();
      this.isRunning = false;
    }, 1000);
  }

  public setVolume(vol: number): void {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped * 0.4, this.ctx.currentTime, 0.1);
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const spaceSoundscape = new SpaceSoundscape();
