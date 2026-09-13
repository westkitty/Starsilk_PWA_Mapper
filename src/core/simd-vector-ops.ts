/**
 * SIMD-Friendly Batch Vector Math Operations on Flat Float64Arrays.
 * Packed format: [x0, y0, z0, x1, y1, z1, ...]
 */

export class SimdVectorOps {
  /**
   * Batch adds v1 += v2 * scale in-place for all 3D vectors.
   */
  public static addScaledInPlace(
    target: Float64Array,
    source: Float64Array,
    scale: number,
    count: number
  ): void {
    const len = count * 3;
    for (let i = 0; i < len; i += 3) {
      target[i] += source[i] * scale;
      target[i + 1] += source[i + 1] * scale;
      target[i + 2] += source[i + 2] * scale;
    }
  }

  /**
   * Computes pair-wise Euclidean distances between all bodies in contiguous memory.
   */
  public static computePairwiseDistances(
    positions: Float64Array,
    count: number,
    outDistances: Float64Array
  ): void {
    let pairIdx = 0;
    for (let i = 0; i < count; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];

      for (let j = i + 1; j < count; j++) {
        const dx = positions[j * 3] - ix;
        const dy = positions[j * 3 + 1] - iy;
        const dz = positions[j * 3 + 2] - iz;
        outDistances[pairIdx++] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
  }
}
