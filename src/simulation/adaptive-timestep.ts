/**
 * Step-Doubling Adaptive Velocity Verlet Timestep Controller.
 * 
 * Accurately estimates local truncation error by comparing one full Verlet step (dt)
 * against two consecutive half-steps (dt/2). Dynamically scales the subsequent
 * simulation timestep using Richardson extrapolation error bounds while enforcing
 * strict [minDt, maxDt] limits.
 */

import { Vector3 } from 'three';
import { CelestialBody } from './types';
import { stepVelocityVerlet } from './integrator';

export interface AdaptiveStepResult {
  nextDt: number;
  accepted: boolean;
  maxError: number;
}

export interface AdaptiveVerletStepResult {
  accepted: boolean;
  success: boolean;
  actualDt: number;
  nextDt: number;
  maxError: number;
  bodies: CelestialBody[];
}

export class AdaptiveTimestepController {
  private minDt: number;
  private maxDt: number;
  private tolerance: number;
  private safetyFactor: number;

  constructor(minDt = 1.0, maxDt = 3600.0, tolerance = 1e-4, safetyFactor = 0.85) {
    this.minDt = minDt;
    this.maxDt = maxDt;
    this.tolerance = tolerance;
    this.safetyFactor = safetyFactor;
  }

  /**
   * Evaluates local truncation error between full-step and half-step positions.
   */
  public evaluateStep(
    fullPositions: Vector3[] | { x: number; y: number; z: number }[],
    halfPositions: Vector3[] | { x: number; y: number; z: number }[],
    currentDt: number
  ): AdaptiveStepResult {
    let maxError = 0;
    const n = Math.min(fullPositions.length, halfPositions.length);

    for (let i = 0; i < n; i++) {
      const pFull = fullPositions[i];
      const pHalf = halfPositions[i];
      const dx = pHalf.x - pFull.x;
      const dy = pHalf.y - pFull.y;
      const dz = pHalf.z - pFull.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const scale = Math.max(Math.sqrt(pHalf.x * pHalf.x + pHalf.y * pHalf.y + pHalf.z * pHalf.z), 1.0);
      const relativeError = dist / scale;
      if (relativeError > maxError) {
        maxError = relativeError;
      }
    }

    const accepted = maxError <= this.tolerance;
    let factor = 1.0;

    if (maxError > 0) {
      // Step-doubling error scaling for 2nd-order symplectic Verlet (local error ~ O(dt^3))
      factor = this.safetyFactor * Math.pow(this.tolerance / maxError, 1.0 / 3.0);
    } else {
      factor = 2.0;
    }

    // Clamp scaling factor to prevent abrupt oscillations
    factor = Math.max(0.2, Math.min(2.0, factor));
    const nextDt = Math.max(this.minDt, Math.min(this.maxDt, currentDt * factor));

    return { nextDt, accepted, maxError };
  }

  /**
   * Executes a step-doubling adaptive step on an array of celestial bodies.
   * Compares 1 full step (dt) against 2 half-steps (dt/2).
   * Does not mutate input bodies if the step is rejected or fails.
   */
  public stepAdaptiveVerlet(
    bodies: CelestialBody[],
    candidateDt: number
  ): AdaptiveVerletStepResult {
    const dt = Math.max(this.minDt, Math.min(this.maxDt, candidateDt));

    // 1. Compute 1 full step (dt) on clone
    const fullState: CelestialBody[] = bodies.map(b => ({
      ...b,
      position: { ...b.position },
      velocity: { ...b.velocity },
    }));
    const okFull = stepVelocityVerlet(fullState, dt);

    // 2. Compute 2 half steps (dt / 2) on clone
    const halfDt = dt * 0.5;
    const halfState: CelestialBody[] = bodies.map(b => ({
      ...b,
      position: { ...b.position },
      velocity: { ...b.velocity },
    }));
    const okHalf1 = stepVelocityVerlet(halfState, halfDt);
    const okHalf2 = okHalf1 && stepVelocityVerlet(halfState, halfDt);

    if (!okFull || !okHalf2) {
      return {
        accepted: false,
        success: false,
        actualDt: 0,
        nextDt: this.minDt,
        maxError: Infinity,
        bodies,
      };
    }

    // 3. Evaluate local error between full-step and half-step predictions
    const evalRes = this.evaluateStep(
      fullState.map(b => b.position),
      halfState.map(b => b.position),
      dt
    );

    if (evalRes.accepted) {
      // Accept the higher-accuracy half-step Richardson state
      return {
        accepted: true,
        success: true,
        actualDt: dt,
        nextDt: evalRes.nextDt,
        maxError: evalRes.maxError,
        bodies: halfState,
      };
    } else {
      // Step rejected; recommend smaller nextDt
      return {
        accepted: false,
        success: true,
        actualDt: 0,
        nextDt: evalRes.nextDt,
        maxError: evalRes.maxError,
        bodies,
      };
    }
  }

  public getMinDt(): number {
    return this.minDt;
  }

  public setMinDt(val: number): void {
    this.minDt = Math.max(0.001, val);
  }

  public getMaxDt(): number {
    return this.maxDt;
  }

  public setMaxDt(val: number): void {
    this.maxDt = Math.max(this.minDt, val);
  }

  public getTolerance(): number {
    return this.tolerance;
  }

  public setTolerance(tol: number): void {
    this.tolerance = Math.max(1e-12, Math.min(1e-1, tol));
  }
}
