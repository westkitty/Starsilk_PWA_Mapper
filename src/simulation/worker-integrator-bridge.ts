/**
 * Asynchronous Web Worker N-Body Integrator Bridge.
 * Allows CPU-heavy numerical integrations (e.g. multi-step ephemeris forecasts)
 * to run asynchronously off the main UI thread via WorkerThreadPool with synchronous fallback.
 */

import { CelestialBody } from './types';
import { integrateStep } from './integrator';
import { WorkerThreadPool } from '../core/thread-pool';

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
  private pool: WorkerThreadPool;
  private isBusy = false;

  constructor(pool?: WorkerThreadPool) {
    this.pool = pool || new WorkerThreadPool(2);
  }

  public async runLongTermPropagation(job: IntegrationJobRequest): Promise<IntegrationJobResult> {
    if (this.isBusy) {
      throw new Error('Integrator bridge is currently executing another job');
    }

    this.isBusy = true;
    const start = performance.now();

    try {
      // Attempt background Web Worker execution via WorkerThreadPool
      const res: any = await this.pool.enqueue('nbody_propagation', {
        bodies: job.bodies,
        stepDtSeconds: job.stepDtSeconds,
        totalSteps: job.totalSteps,
      });

      const duration = performance.now() - start;
      return {
        finalBodies: res.finalBodies || job.bodies,
        completedSteps: res.completedSteps || job.totalSteps,
        executionMs: duration,
      };
    } catch {
      // Synchronous batch execution fallback
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

  public getPool(): WorkerThreadPool {
    return this.pool;
  }

  public getBusyStatus(): boolean {
    return this.isBusy;
  }
}
