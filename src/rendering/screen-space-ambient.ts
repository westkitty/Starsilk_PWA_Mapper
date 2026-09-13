/**
 * Celestial Horizon Contact Occlusion Shading Helper.
 * Computes analytical horizon darkening and line-of-sight occlusion between neighboring celestial bodies.
 */

import { Vector3 } from 'three';

export class HorizonContactShading {
  /**
   * Computes contact occlusion factor between 0.0 (fully occluded/dark) and 1.0 (unoccluded).
   */
  public static computeContactOcclusion(
    surfaceNormal: Vector3,
    toNeighbor: Vector3,
    neighborRadius: number
  ): number {
    const dist = toNeighbor.length();
    if (dist <= 0) return 0.0;

    const dir = new Vector3().copy(toNeighbor).normalize();
    const cosAngle = surfaceNormal.dot(dir);

    // If neighbor is below horizon, no direct line-of-sight occlusion on top hemisphere
    if (cosAngle <= 0) return 1.0;

    // Angular size of neighbor: sin(theta) ~ R / d
    const sinTheta = Math.min(1.0, neighborRadius / dist);
    const occlusionFraction = sinTheta * cosAngle;

    return Math.max(0.0, Math.min(1.0, 1.0 - occlusionFraction));
  }
}
