/**
 * Deterministic Simulation Checkpoint & Replay System.
 * Records state snapshots and enables zero-drift backward/forward scrubbing.
 */

import { CelestialBody } from './types';

export interface ReplayFrame {
  epochSeconds: number;
  bodies: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
  }>;
}

export class SimulationReplayRecorder {
  private frames: ReplayFrame[] = [];
  private maxFrames: number;
  private intervalSteps: number;
  private stepCount = 0;

  constructor(maxFrames = 1800, intervalSteps = 5) {
    this.maxFrames = maxFrames;
    this.intervalSteps = intervalSteps;
  }

  public record(epochSeconds: number, bodies: CelestialBody[]): void {
    this.stepCount++;
    if (this.stepCount % this.intervalSteps !== 0) return;

    const frame: ReplayFrame = {
      epochSeconds,
      bodies: bodies.map(b => ({
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        z: b.position.z,
        vx: b.velocity.x,
        vy: b.velocity.y,
        vz: b.velocity.z,
      })),
    };

    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  public getFrames(): readonly ReplayFrame[] {
    return this.frames;
  }

  public getInterpolatedFrame(epochSeconds: number): ReplayFrame | null {
    if (this.frames.length === 0) return null;
    if (epochSeconds <= this.frames[0].epochSeconds) return this.frames[0];
    if (epochSeconds >= this.frames[this.frames.length - 1].epochSeconds) {
      return this.frames[this.frames.length - 1];
    }

    // Binary search for surrounding frames
    let low = 0;
    let high = this.frames.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.frames[mid].epochSeconds <= epochSeconds) {
        if (mid === this.frames.length - 1 || this.frames[mid + 1].epochSeconds > epochSeconds) {
          const f1 = this.frames[mid];
          const f2 = this.frames[mid + 1];
          const dt = f2.epochSeconds - f1.epochSeconds;
          const alpha = dt > 0 ? (epochSeconds - f1.epochSeconds) / dt : 0;

          // Linear interpolation between frames
          const interpolatedBodies = f1.bodies.map(b1 => {
            const b2 = f2.bodies.find(b => b.id === b1.id) || b1;
            return {
              id: b1.id,
              x: b1.x + (b2.x - b1.x) * alpha,
              y: b1.y + (b2.y - b1.y) * alpha,
              z: b1.z + (b2.z - b1.z) * alpha,
              vx: b1.vx + (b2.vx - b1.vx) * alpha,
              vy: b1.vy + (b2.vy - b1.vy) * alpha,
              vz: b1.vz + (b2.vz - b1.vz) * alpha,
            };
          });

          return {
            epochSeconds,
            bodies: interpolatedBodies,
          };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return this.frames[this.frames.length - 1];
  }

  public clear(): void {
    this.frames = [];
    this.stepCount = 0;
  }
}
