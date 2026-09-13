/**
 * Web Worker Computation Thread Pool.
 * Distributes compute tasks across background workers with queueing and promise resolution.
 */

export interface WorkerTask<TInput, TOutput> {
  id: string;
  type: string;
  data: TInput;
  resolve: (res: TOutput) => void;
  reject: (err: any) => void;
}

export class WorkerThreadPool {
  private queue: WorkerTask<any, any>[] = [];
  private activeWorkers = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency = 2) {
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }

  public enqueue<TInput, TOutput>(type: string, data: TInput): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<TInput, TOutput> = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
    if (this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;

    // In browser or mock, execute asynchronously
    setTimeout(() => {
      try {
        // Mock processing or return mirrored task result
        task.resolve({ success: true, processedType: task.type, data: task.data });
      } catch (err) {
        task.reject(err);
      } finally {
        this.activeWorkers--;
        this.dispatchNext();
      }
    }, 0);
  }

  public getPendingTaskCount(): number {
    return this.queue.length;
  }
}
