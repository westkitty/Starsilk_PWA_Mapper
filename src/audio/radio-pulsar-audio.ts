/**
 * Procedural Radio Astronomy Audio Synthesizer (Pulsars & Magnetospheric Whistlers).
 * Synthesizes periodic pulsar pulse clicks and descending whistler frequency sweeps using Web Audio.
 */

export class RadioAstronomyAudio {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;

  constructor(ctx?: AudioContext) {
    if (ctx) this.ctx = ctx;
  }

  public setContext(ctx: AudioContext): void {
    this.ctx = ctx;
  }

  /**
   * Generates a rapid sawtooth pulse simulating a high-frequency radio pulsar emission blip.
   */
  public playPulsarPulse(frequencyHz = 800, pulseDurationMs = 15): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(frequencyHz, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + pulseDurationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + pulseDurationMs / 1000);
    } catch {
      // ignore
    }
  }

  /**
   * Generates a magnetospheric whistler dispersion sweep where high frequencies arrive first
   * followed by lower frequencies over a descending chirp.
   */
  public playWhistlerSweep(startFreq = 4000, endFreq = 400, durationSec = 1.2): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.2, now + durationSec * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
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

