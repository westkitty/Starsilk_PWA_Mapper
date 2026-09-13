/**
 * BACK10: Deterministic Seeded PRNG.
 * Implements Mulberry32 and SplitMix32 for reproducible procedural generators,
 * star distributions, and orbital perturbations.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed | 0;
  }

  setSeed(seed: number): void {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

export const defaultRNG = new SeededRNG(42);
