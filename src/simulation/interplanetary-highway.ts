/**
 * CR3BP-Inspired Low-Energy Transit Corridor Approximation.
 * Approximates ballistic transit corridors branching from collinear L1/L2 libration
 * points based on Circular Restricted Three-Body Problem (CR3BP) saddle-point
 * dynamics, Jacobi energy constant approximations, and Hill-sphere boundary geometry.
 * 
 * Note: These trajectories are analytical/geometric corridor approximations,
 * not numerically integrated unstable invariant manifolds of solved periodic orbits.
 */

import { Vector3 } from 'three';

export interface ManifoldTube {
  originLagrangePoint: 'L1' | 'L2';
  trajectorySpline: Vector3[];
  jacobiConstant: number;
  transferDurationDays: number;
  hillRadiusAu: number;
}

export class InterplanetaryHighwayEngine {
  /**
   * Generates CR3BP-inspired low-energy transit corridor approximations branching from L1 and L2 libration points.
   * @param l1Pos Position of L1 point
   * @param l2Pos Position of L2 point
   * @param primaryPos Position of primary mass
   * @param secondaryPos Position of secondary mass
   * @param primaryMass Mass of primary in solar masses (default 1.0)
   * @param secondaryMass Mass of secondary in solar masses (default 0.001)
   */
  public static generateManifolds(
    l1Pos: Vector3,
    l2Pos: Vector3,
    primaryPos: Vector3,
    secondaryPos: Vector3,
    primaryMass = 1.0,
    secondaryMass = 0.001
  ): ManifoldTube[] {
    const tubes: ManifoldTube[] = [];

    const totalMass = primaryMass + secondaryMass;
    const mu = secondaryMass / Math.max(1e-9, totalMass);
    const sepVector = new Vector3().subVectors(secondaryPos, primaryPos);
    const d = Math.max(0.1, sepVector.length());

    // Hill sphere radius: r_H = d * (mu / 3)^(1/3)
    const hillRadius = d * Math.cbrt(mu / 3.0);

    // Orbital frequency: n = sqrt(G * M_tot / d^3) in rad/yr (with G=4*pi^2 in AU, yr, M_sun)
    const n = Math.sqrt((4 * Math.PI * Math.PI * totalMass) / Math.pow(d, 3));

    // Collinear saddle eigenvalue proxy: lambda ~ sqrt(2 * (2 * mu / 3 + 1)) * n
    const lambda = Math.sqrt(2.0 * (1.0 + 2.0 * Math.cbrt(mu / 3.0))) * n;

    // Jacobi constant approximations for L1 and L2
    // C_j ~ 3 + 3^(4/3) * mu^(2/3)
    const cj1 = 3.0 + Math.pow(3, 4 / 3) * Math.pow(mu, 2 / 3) - (10 / 3) * mu;
    const cj2 = 3.0 + Math.pow(3, 4 / 3) * Math.pow(mu, 2 / 3) - (14 / 3) * mu;

    const axis = sepVector.clone().normalize();
    const perp = new Vector3(-axis.y, axis.x, axis.z).normalize();
    const outOfPlane = new Vector3().crossVectors(axis, perp).normalize();

    // 1. L1 interior transit corridor towards primary
    const l1Points: Vector3[] = [];
    const steps = 24;
    const l1DurationDays = Math.round((Math.PI / Math.max(0.1, lambda)) * 365.25 * 0.4);

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      // Exponential departure along unstable eigenvector + Coriolis rotation
      const tNorm = frac * 1.8;
      const departure = (Math.exp(tNorm) - 1.0) / (Math.exp(1.8) - 1.0);
      const angle = frac * Math.PI * 0.8;

      const pt = new Vector3()
        .copy(l1Pos)
        .addScaledVector(axis, -departure * (d * 0.45 + hillRadius))
        .addScaledVector(perp, Math.sin(angle) * hillRadius * 1.2)
        .addScaledVector(outOfPlane, Math.sin(angle * 2) * hillRadius * 0.2);

      l1Points.push(pt);
    }

    tubes.push({
      originLagrangePoint: 'L1',
      trajectorySpline: l1Points,
      jacobiConstant: cj1,
      transferDurationDays: Math.max(10, l1DurationDays),
      hillRadiusAu: hillRadius,
    });

    // 2. L2 exterior transit corridor towards outer solar system
    const l2Points: Vector3[] = [];
    const l2DurationDays = Math.round((Math.PI / Math.max(0.1, lambda)) * 365.25 * 0.6);

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const tNorm = frac * 1.6;
      const departure = (Math.exp(tNorm) - 1.0) / (Math.exp(1.6) - 1.0);
      const angle = frac * Math.PI * 0.6;

      const pt = new Vector3()
        .copy(l2Pos)
        .addScaledVector(axis, departure * (d * 0.65 + hillRadius * 1.5))
        .addScaledVector(perp, Math.cos(angle) * hillRadius * 1.4)
        .addScaledVector(outOfPlane, -Math.sin(angle * 2) * hillRadius * 0.25);

      l2Points.push(pt);
    }

    tubes.push({
      originLagrangePoint: 'L2',
      trajectorySpline: l2Points,
      jacobiConstant: cj2,
      transferDurationDays: Math.max(15, l2DurationDays),
      hillRadiusAu: hillRadius,
    });

    return tubes;
  }
}
