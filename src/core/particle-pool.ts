/**
 * Memory-Efficient Float32/Float64 TypedArray Particle Pools.
 * Provides high-performance, zero-allocation buffers for thousands of particles.
 */

export interface ParticleAttributes {
  maxParticles: number;
  positions: Float32Array; // x, y, z triplets
  velocities: Float32Array; // vx, vy, vz triplets
  colors: Float32Array; // r, g, b triplets
  lifespans: Float32Array; // remaining life, total life pairs
  count: number;
}

export class ParticlePool {
  public maxParticles: number;
  public positions: Float32Array;
  public velocities: Float32Array;
  public colors: Float32Array;
  public lifespans: Float32Array;
  public count: number = 0;

  constructor(maxParticles = 5000) {
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.lifespans = new Float32Array(maxParticles * 2); // [currentLife, maxLife]
  }

  public spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    r: number, g: number, b: number,
    maxLife: number
  ): number {
    if (this.count >= this.maxParticles) {
      return -1; // Pool full
    }

    const idx = this.count;
    const p3 = idx * 3;
    const p2 = idx * 2;

    this.positions[p3] = x;
    this.positions[p3 + 1] = y;
    this.positions[p3 + 2] = z;

    this.velocities[p3] = vx;
    this.velocities[p3 + 1] = vy;
    this.velocities[p3 + 2] = vz;

    this.colors[p3] = r;
    this.colors[p3 + 1] = g;
    this.colors[p3 + 2] = b;

    this.lifespans[p2] = maxLife;
    this.lifespans[p2 + 1] = maxLife;

    this.count++;
    return idx;
  }

  public update(dtSeconds: number): void {
    let active = 0;

    for (let i = 0; i < this.count; i++) {
      const p2 = i * 2;
      this.lifespans[p2] -= dtSeconds;

      if (this.lifespans[p2] > 0) {
        const p3 = i * 3;
        // Integrate position
        this.positions[p3] += this.velocities[p3] * dtSeconds;
        this.positions[p3 + 1] += this.velocities[p3 + 1] * dtSeconds;
        this.positions[p3 + 2] += this.velocities[p3 + 2] * dtSeconds;

        if (active !== i) {
          // Swap element to compact active pool
          const a3 = active * 3;
          const a2 = active * 2;

          this.positions[a3] = this.positions[p3];
          this.positions[a3 + 1] = this.positions[p3 + 1];
          this.positions[a3 + 2] = this.positions[p3 + 2];

          this.velocities[a3] = this.velocities[p3];
          this.velocities[a3 + 1] = this.velocities[p3 + 1];
          this.velocities[a3 + 2] = this.velocities[p3 + 2];

          this.colors[a3] = this.colors[p3];
          this.colors[a3 + 1] = this.colors[p3 + 1];
          this.colors[a3 + 2] = this.colors[p3 + 2];

          this.lifespans[a2] = this.lifespans[p2];
          this.lifespans[a2 + 1] = this.lifespans[p2 + 1];
        }
        active++;
      }
    }

    this.count = active;
  }

  public reset(): void {
    this.count = 0;
  }
}
