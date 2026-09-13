/**
 * Synthesized Radio Astronomy Audio Generator (Pulsars & Magnetospheric Whistlers).
 * Procedurally synthesizes high-frequency radio pulses and whistler dispersion sweeps using Web Audio.
 */

export class RadioAstronomyAudio {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;

  constructor(ctx?: AudioContext) {
    if (ctx) this.ctx = ctx;
  }

  public playPulsarPulse(frequencyHz = 800, pulseDurationMs = 15): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequencyHz, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + pulseDurationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + pulseDurationMs / 1000);
    } catch {
      // ignore
    }
  }

  public startPulsarBeacon(periodMs = 250): void {
    if (this.timer) this.stop();
    this.timer = window.setInterval(() => {
      this.playPulsarPulse();
    }, periodMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
