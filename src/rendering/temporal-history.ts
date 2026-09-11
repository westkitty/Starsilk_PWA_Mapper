/**
 * Presentation-layer Bounded Temporal History Buffer for FATE LENS.
 *
 * Invariants:
 * - Strictly presentation-layer: zero effect on simulation physics, state snapshots, or save files.
 * - Strictly bounded: each body has a fixed capacity ring buffer (max 120 samples).
 * - Rate-limited: only records when simulation time advances by at least minTimeDeltaSec.
 * - Reset hygiene: cleared completely on system resets, preset loads, project imports, or branch switches.
 */

import { Vector3D } from '../simulation/types';

export interface TemporalSample {
  positionKm: Vector3D;
  velocityKmS: Vector3D;
  timestampSec: number;
}

export interface TemporalEcho {
  positionKm: Vector3D;
  velocityKmS: Vector3D;
  timestampSec: number;
  ageSec: number;
  normalizedAge: number; // 0.0 = most recent (closest to now), 1.0 = oldest
}

export class TemporalHistoryBuffer {
  private readonly maxSamplesPerBody: number;
  private readonly minTimeDeltaSec: number;
  private history: Map<string, TemporalSample[]> = new Map();

  constructor(maxSamples: number = 120, minTimeDeltaSec: number = 0.25) {
    this.maxSamplesPerBody = Math.max(10, maxSamples);
    this.minTimeDeltaSec = Math.max(0.01, minTimeDeltaSec);
  }

  /**
   * Record a body sample if simulation time has advanced sufficiently.
   * Returns true if a new sample was recorded.
   */
  public recordSample(
    bodyId: string,
    positionKm: Vector3D,
    velocityKmS: Vector3D,
    timestampSec: number
  ): boolean {
    let samples = this.history.get(bodyId);
    if (!samples) {
      samples = [];
      this.history.set(bodyId, samples);
    }

    if (samples.length > 0) {
      const last = samples[samples.length - 1];

      // If time scrubbed backwards or jumped, prune any historical samples that now lie in the future of current time
      if (timestampSec < last.timestampSec) {
        while (samples.length > 0 && samples[samples.length - 1].timestampSec > timestampSec) {
          samples.pop();
        }
      }

      if (samples.length > 0) {
        const currentLast = samples[samples.length - 1];
        // Rate-limit forward progression
        if (timestampSec - currentLast.timestampSec < this.minTimeDeltaSec) {
          return false;
        }
      }
    }

    const sample: TemporalSample = {
      positionKm: { x: positionKm.x, y: positionKm.y, z: positionKm.z },
      velocityKmS: { x: velocityKmS.x, y: velocityKmS.y, z: velocityKmS.z },
      timestampSec,
    };

    samples.push(sample);

    // Enforce bounded ring buffer limit
    if (samples.length > this.maxSamplesPerBody) {
      samples.shift();
    }

    return true;
  }

  /**
   * Retrieve N evenly spaced past echoes for a body, ordered from oldest to most recent.
   */
  public getRecentEchoes(bodyId: string, requestedCount: number = 6): TemporalEcho[] {
    const samples = this.history.get(bodyId);
    if (!samples || samples.length < 2) {
      return [];
    }

    const count = Math.max(2, Math.min(requestedCount, samples.length));
    const newest = samples[samples.length - 1];
    const oldest = samples[0];
    const totalSpanSec = Math.max(0.001, newest.timestampSec - oldest.timestampSec);

    const echoes: TemporalEcho[] = [];
    const step = (samples.length - 1) / (count - 1);

    for (let i = 0; i < count; i++) {
      const sampleIndex = Math.min(samples.length - 1, Math.round(i * step));
      const s = samples[sampleIndex];
      const ageSec = Math.max(0, newest.timestampSec - s.timestampSec);
      const normalizedAge = Math.min(1.0, Math.max(0.0, ageSec / totalSpanSec));

      echoes.push({
        positionKm: { ...s.positionKm },
        velocityKmS: { ...s.velocityKmS },
        timestampSec: s.timestampSec,
        ageSec,
        normalizedAge,
      });
    }

    return echoes;
  }

  /**
   * Get the total number of samples currently held for a body.
   */
  public getSampleCount(bodyId: string): number {
    return this.history.get(bodyId)?.length || 0;
  }

  /**
   * Clear history for a specific body.
   */
  public clearBody(bodyId: string): void {
    this.history.delete(bodyId);
  }

  /**
   * Clear all presentation history. Essential when switching branches or loading presets.
   */
  public clear(): void {
    this.history.clear();
  }
}
