/**
 * Memory Governor & Cache Lifecycle Manager.
 * Monitors JS heap usage (where performance.memory is available) and triggers pruning callbacks when thresholds are exceeded.
 */

export interface MemoryReport {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  heapUsageRatio?: number;
}

type PruneCallback = (severity: 'light' | 'aggressive') => void;

export class MemoryGovernor {
  private static listeners: Set<PruneCallback> = new Set();
  private static highWatermarkRatio = 0.85; // 85% of heap limit triggers light prune
  private static criticalRatio = 0.95; // 95% triggers aggressive prune

  public static onPruneRequested(callback: PruneCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public static getMemoryReport(): MemoryReport {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      const used = mem.usedJSHeapSize;
      const total = mem.totalJSHeapSize;
      const limit = mem.jsHeapSizeLimit;
      const ratio = limit > 0 ? used / limit : undefined;
      return {
        usedJSHeapSize: used,
        totalJSHeapSize: total,
        jsHeapSizeLimit: limit,
        heapUsageRatio: ratio,
      };
    }
    return {};
  }

  public static checkAndPrune(): boolean {
    const report = this.getMemoryReport();
    if (report.heapUsageRatio !== undefined) {
      if (report.heapUsageRatio >= this.criticalRatio) {
        this.triggerPrune('aggressive');
        return true;
      } else if (report.heapUsageRatio >= this.highWatermarkRatio) {
        this.triggerPrune('light');
        return true;
      }
    }
    return false;
  }

  public static triggerPrune(severity: 'light' | 'aggressive'): void {
    for (const cb of this.listeners) {
      try {
        cb(severity);
      } catch (err) {
        console.error('MemoryGovernor callback failed', err);
      }
    }
  }
}
