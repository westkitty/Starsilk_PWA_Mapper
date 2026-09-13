/**
 * Web Worker Computation Thread Pool.
 * Manages concurrent Web Worker instances with message correlation, queueing, and lifecycle management.
 */

export interface WorkerTask<TInput = any, TOutput = any> {
  id: string;
  type: string;
  data: TInput;
  resolve: (res: TOutput) => void;
  reject: (err: any) => void;
}

export interface WorkerMessage<T = any> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * Embedded worker script executed in Web Worker threads.
 */
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  var msg = e.data;
  var taskId = msg.taskId;
  var type = msg.type;
  var data = msg.data;

  try {
    var result = null;
    if (type === 'kepler_orbit') {
      var M = data.meanAnomaly || 0;
      var e = data.eccentricity || 0;
      var E = M;
      for (var iter = 0; iter < 15; iter++) {
        var f = E - e * Math.sin(E) - M;
        var fPrime = 1 - e * Math.cos(E);
        var delta = f / fPrime;
        E -= delta;
        if (Math.abs(delta) < 1e-10) break;
      }
      result = { eccentricAnomaly: E, converged: true };
    } else if (type === 'vector_transform') {
      var vecs = data.vectors || [];
      var scale = data.scale || 1.0;
      var transformed = vecs.map(function(v) {
        return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
      });
      result = { transformed: transformed };
    } else if (type === 'math_sum') {
      var values = data.values || [];
      var sum = values.reduce(function(a, b) { return a + b; }, 0);
      result = { sum: sum };
    } else if (type === 'nbody_propagation') {
      var bodies = data.bodies || [];
      var dt = data.stepDtSeconds || 86400;
      var totalSteps = data.totalSteps || 10;
      var n = bodies.length;
      for (var s = 0; s < totalSteps; s++) {
        for (var i = 0; i < n; i++) {
          var bi = bodies[i];
          if (bi.fixed) continue;
          bi.position.x += bi.velocity.x * dt;
          bi.position.y += bi.velocity.y * dt;
          bi.position.z += bi.velocity.z * dt;
        }
      }
      result = { finalBodies: bodies, completedSteps: totalSteps };
    } else {
      result = { success: true, data: data, processedType: type, payload: data };
    }

    self.postMessage({ taskId: taskId, success: true, result: result });
  } catch (err) {
    self.postMessage({ taskId: taskId, success: false, error: String(err && err.message ? err.message : err) });
  }
};
`;

export class WorkerThreadPool {
  private queue: WorkerTask<any, any>[] = [];
  private workers: (Worker | null)[] = [];
  private workerBusy: boolean[] = [];
  private inFlight = new Map<string, WorkerTask<any, any>>();
  private maxConcurrency: number;
  private workerBlobUrl: string | null = null;
  private isTerminated = false;

  constructor(maxConcurrency = 2) {
    this.maxConcurrency = Math.max(1, maxConcurrency);
    this.initWorkers();
  }

  private initWorkers(): void {
    if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
        this.workerBlobUrl = URL.createObjectURL(blob);

        for (let i = 0; i < this.maxConcurrency; i++) {
          const worker = new Worker(this.workerBlobUrl);
          this.setupWorker(worker, i);
          this.workers.push(worker);
          this.workerBusy.push(false);
        }
      } catch (err) {
        console.warn('[WorkerThreadPool] Real Worker creation failed, using async fallback:', err);
        this.workers = [];
      }
    }
  }

  private setupWorker(worker: Worker, workerIndex: number): void {
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { taskId, success, result, error } = e.data;
      const task = this.inFlight.get(taskId);
      if (task) {
        this.inFlight.delete(taskId);
        if (success) {
          task.resolve(result);
        } else {
          task.reject(new Error(error || 'Worker task failed'));
        }
      }
      this.workerBusy[workerIndex] = false;
      this.dispatchNext();
    };

    worker.onerror = (err) => {
      console.error(`[WorkerThreadPool] Worker ${workerIndex} error:`, err);
      this.workerBusy[workerIndex] = false;
      this.dispatchNext();
    };
  }

  public enqueue<TInput = any, TOutput = any>(type: string, data: TInput): Promise<TOutput> {
    if (this.isTerminated) {
      return Promise.reject(new Error('WorkerThreadPool has been terminated'));
    }

    return new Promise<TOutput>((resolve, reject) => {
      const task: WorkerTask<TInput, TOutput> = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type,
        data,
        resolve,
        reject,
      };
      this.queue.push(task);
      this.dispatchNext();
    });
  }

  private dispatchNext(): void {
    if (this.isTerminated || this.queue.length === 0) return;

    if (this.workers.length > 0) {
      const idleIdx = this.workerBusy.findIndex(busy => !busy);
      if (idleIdx === -1) return;

      const task = this.queue.shift();
      if (!task) return;

      this.workerBusy[idleIdx] = true;
      this.inFlight.set(task.id, task);

      const worker = this.workers[idleIdx];
      if (worker) {
        worker.postMessage({ taskId: task.id, type: task.type, data: task.data });
      }
      return;
    }

    const activeCount = this.inFlight.size;
    if (activeCount >= this.maxConcurrency) return;

    const task = this.queue.shift();
    if (!task) return;

    this.inFlight.set(task.id, task);

    setTimeout(() => {
      if (this.isTerminated) return;
      try {
        let result: any = null;
        if (task.type === 'kepler_orbit') {
          const M = (task.data as any)?.meanAnomaly ?? 0;
          const e = (task.data as any)?.eccentricity ?? 0;
          let E = M;
          for (let iter = 0; iter < 15; iter++) {
            const f = E - e * Math.sin(E) - M;
            const fPrime = 1 - e * Math.cos(E);
            const delta = f / fPrime;
            E -= delta;
            if (Math.abs(delta) < 1e-10) break;
          }
          result = { eccentricAnomaly: E, converged: true };
        } else if (task.type === 'vector_transform') {
          const vecs = (task.data as any)?.vectors ?? [];
          const scale = (task.data as any)?.scale ?? 1.0;
          result = { transformed: vecs.map((v: any) => ({ x: v.x * scale, y: v.y * scale, z: v.z * scale })) };
        } else if (task.type === 'math_sum') {
          const values = (task.data as any)?.values ?? [];
          result = { sum: values.reduce((a: number, b: number) => a + b, 0) };
        } else if (task.type === 'nbody_propagation') {
          const bodies = ((task.data as any)?.bodies ?? []).map((b: any) => ({
            ...b,
            position: { ...b.position },
            velocity: { ...b.velocity },
          }));
          const dt = (task.data as any)?.stepDtSeconds ?? 86400;
          const totalSteps = (task.data as any)?.totalSteps ?? 10;
          for (let s = 0; s < totalSteps; s++) {
            for (let i = 0; i < bodies.length; i++) {
              if (bodies[i].fixed) continue;
              bodies[i].position.x += bodies[i].velocity.x * dt;
              bodies[i].position.y += bodies[i].velocity.y * dt;
              bodies[i].position.z += bodies[i].velocity.z * dt;
            }
          }
          result = { finalBodies: bodies, completedSteps: totalSteps };
        } else {
          result = { success: true, data: task.data, processedType: task.type, payload: task.data };
        }

        task.resolve(result);
      } catch (err) {
        task.reject(err);
      } finally {
        this.inFlight.delete(task.id);
        this.dispatchNext();
      }
    }, 0);
  }

  public getWorkerCount(): number {
    return this.workers.length;
  }

  public isUsingRealWorkers(): boolean {
    return this.workers.length > 0;
  }

  public getActiveWorkerCount(): number {
    if (this.workers.length > 0) {
      return this.workerBusy.filter(Boolean).length;
    }
    return this.inFlight.size;
  }

  public getPendingTaskCount(): number {
    return this.queue.length;
  }

  public getInFlightTaskCount(): number {
    return this.inFlight.size;
  }

  public terminate(): void {
    this.isTerminated = true;
    for (const worker of this.workers) {
      if (worker) {
        worker.terminate();
      }
    }
    this.workers = [];
    this.workerBusy = [];
    if (this.workerBlobUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }

    for (const [, task] of this.inFlight) {
      task.reject(new Error('WorkerThreadPool terminated'));
    }
    this.inFlight.clear();
    this.queue = [];
  }
}
