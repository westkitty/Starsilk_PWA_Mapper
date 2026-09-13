/**
 * Adaptive Runge-Kutta-Fehlberg (RKF45 / Embedded Dormand-Prince) Timestep Controller.
 * Dynamically scales dt based on local truncation error estimates.
 */

import { Vector3 } from 'three';

export interface AdaptiveStepResult {
  nextDt: number;
  accepted: boolean;
  maxError: number;
}

export class AdaptiveTimestepController {
  private minDt: number;
  private maxDt: number;
  private tolerance: number;
  private safetyFactor: number;

  constructor(minDt = 0.0001, maxDt = 1.0, tolerance = 1e-6, safetyFactor = 0.9) {
    this.minDt = minDt;
    this.maxDt = maxDt;
    this.tolerance = tolerance;
    this.safetyFactor = safetyFactor;
  }

  /**
   * Evaluate truncation error between 4th-order and 5th-order predicted positions.
   */
  public evaluateStep(
    order4Positions: Vector3[],
    order5Positions: Vector3[],
    currentDt: number
  ): AdaptiveStepResult {
    let maxError = 0;

    for (let i = 0; i < order4Positions.length; i++) {
      const p4 = order4Positions[i];
      const p5 = order5Positions[i];
      const dist = p4.distanceTo(p5);
      const scale = Math.max(p5.length(), 1.0);
      const relativeError = dist / scale;
      if (relativeError > maxError) {
        maxError = relativeError;
      }
    }

    const accepted = maxError <= this.tolerance;
    let factor = 1.0;

    if (maxError > 0) {
      factor = this.safetyFactor * Math.pow(this.tolerance / maxError, 0.2);
    } else {
      factor = 2.0;
    }

    // Clamp scaling factor
    factor = Math.max(0.2, Math.min(2.0, factor));
    const nextDt = Math.max(this.minDt, Math.min(this.maxDt, currentDt * factor));

    return { nextDt, accepted, maxError };
  }

  public getTolerance(): number {
    return this.tolerance;
  }

  public setTolerance(tol: number): void {
    this.tolerance = Math.max(1e-12, Math.min(1e-2, tol));
  }
}
