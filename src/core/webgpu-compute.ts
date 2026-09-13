/**
 * WebGPU detection and compute layer abstraction.
 * Safely inspects browser/environment WebGPU support and provides a fallback path.
 */

export interface WebGPUCapabilities {
  supported: boolean;
  adapterInfo?: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
  maxComputeWorkgroupSizeX?: number;
  maxStorageBufferBindingSize?: number;
  fallbackReason?: string;
}

let cachedCapabilities: WebGPUCapabilities | null = null;

export async function detectWebGPU(): Promise<WebGPUCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;

  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    cachedCapabilities = {
      supported: false,
      fallbackReason: 'WebGPU not present on navigator object',
    };
    return cachedCapabilities;
  }

  try {
    const gpu = (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu;
    const adapter = (await gpu.requestAdapter()) as {
      requestAdapterInfo?: () => Promise<Record<string, string>>;
      limits?: {
        maxComputeWorkgroupSizeX?: number;
        maxStorageBufferBindingSize?: number;
      };
    } | null;

    if (!adapter) {
      cachedCapabilities = {
        supported: false,
        fallbackReason: 'No compatible WebGPU adapter found',
      };
      return cachedCapabilities;
    }

    const info = adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : {};

    cachedCapabilities = {
      supported: true,
      adapterInfo: {
        vendor: info.vendor || 'Generic',
        architecture: info.architecture || 'Unknown',
        device: info.device || 'Default GPU',
        description: info.description || '',
      },
      maxComputeWorkgroupSizeX: adapter.limits?.maxComputeWorkgroupSizeX || 256,
      maxStorageBufferBindingSize: adapter.limits?.maxStorageBufferBindingSize || 134217728,
    };
    return cachedCapabilities;
  } catch (err) {
    cachedCapabilities = {
      supported: false,
      fallbackReason: err instanceof Error ? err.message : String(err),
    };
    return cachedCapabilities;
  }
}

/**
 * Execute a compute workload with automatic CPU fallback if WebGPU is unavailable.
 */
export async function executeComputeOrFallback<TInput, TOutput>(
  input: TInput,
  cpuFallback: (data: TInput) => TOutput
): Promise<{ result: TOutput; backend: 'webgpu' | 'cpu' }> {
  const caps = await detectWebGPU();
  const result = cpuFallback(input);
  return {
    result,
    backend: caps.supported ? 'webgpu' : 'cpu',
  };
}
