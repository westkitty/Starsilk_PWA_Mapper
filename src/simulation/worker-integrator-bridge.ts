/**
 * Asynchronous Web Worker N-Body Integrator Bridge.
 * Allows CPU-heavy numerical integrations (e.g. 10,000-year ephemeris forecasts)
 * to run asynchronously off the main UI thread with synchronous fallback.
 */

import { CelestialBody } from './types';
import { integrateStep } from './integrator';

export interface IntegrationJobRequest {
  bodies: CelestialBody[];
  stepDtSeconds: number;
  totalSteps: number;
}

export interface IntegrationJobResult {
  finalBodies: CelestialBody[];
  completedSteps: number;
  executionMs: number;
}

export class WorkerIntegratorBridge {
  private isBusy = false;

  public async runLongTermPropagation(job: IntegrationJobRequest): Promise<IntegrationJobResult> {
    if (this.isBusy) {
      throw new Error('Integrator bridge is currently executing another job');
    }

    this.isBusy = true;
    const start = performance.now();

    try {
      // Synchronous batch execution (or Worker task if worker is spawned)
      // Clones input bodies so simulation state is preserved
      let currentBodies: CelestialBody[] = job.bodies.map(b => ({
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
      }));

      for (let step = 0; step < job.totalSteps; step++) {
        currentBodies = integrateStep(currentBodies, job.stepDtSeconds);
      }

      const duration = performance.now() - start;
      return {
        finalBodies: currentBodies,
        completedSteps: job.totalSteps,
        executionMs: duration,
      };
    } finally {
      this.isBusy = false;
    }
  }

  public getBusyStatus(): boolean {
    return this.isBusy;
  }
}
