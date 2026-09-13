/**
 * Interplanetary Transport Network & Invariant Manifold Tubes.
 * Generates low-energy ballistic transit corridors branching from L1/L2 libration points (Weak Stability Boundary).
 */

import { Vector3 } from 'three';

export interface ManifoldTube {
  originLagrangePoint: 'L1' | 'L2';
  trajectorySpline: Vector3[];
  energyLevel: number;
  transferDurationDays: number;
}

export class InterplanetaryHighwayEngine {
  public static generateManifolds(
    l1Pos: Vector3,
    l2Pos: Vector3,
    primaryPos: Vector3,
    secondaryPos: Vector3
  ): ManifoldTube[] {
    const tubes: ManifoldTube[] = [];

    // Direction along secondary orbital axis
    const axis = new Vector3().subVectors(secondaryPos, primaryPos).normalize();
    const perp = new Vector3(-axis.y, axis.x, axis.z).normalize();

    // L1 interior transit tube towards primary
    const l1Points: Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const frac = i / 20;
      const pt = new Vector3()
        .copy(l1Pos)
        .addScaledVector(axis, -frac * 1.5)
        .addScaledVector(perp, Math.sin(frac * Math.PI * 2) * 0.4);
      l1Points.push(pt);
    }
    tubes.push({
      originLagrangePoint: 'L1',
      trajectorySpline: l1Points,
      energyLevel: -1.5,
      transferDurationDays: 120,
    });

    // L2 exterior transit tube towards outer system
    const l2Points: Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const frac = i / 20;
      const pt = new Vector3()
        .copy(l2Pos)
        .addScaledVector(axis, frac * 2.0)
        .addScaledVector(perp, Math.cos(frac * Math.PI * 2) * 0.5);
      l2Points.push(pt);
    }
    tubes.push({
      originLagrangePoint: 'L2',
      trajectorySpline: l2Points,
      energyLevel: -1.4,
      transferDurationDays: 180,
    });

    return tubes;
  }
}
