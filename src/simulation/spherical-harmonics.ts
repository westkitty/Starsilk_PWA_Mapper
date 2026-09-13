/**
 * Gravitational Spherical Harmonics (Zonal J2, J3, J4 Multipole Expansion).
 * Models non-spherical oblate mass distribution effects (nodal regression and apsidal precession).
 */

import { Vector3 } from 'three';

export interface OblatenessParams {
  mu: number; // Standard gravitational parameter GM
  radius: number; // Equatorial radius R_eq
  j2: number; // Quadrupole moment (e.g. Earth ~ 1.08263e-3, Jupiter ~ 1.4736e-2)
  j3?: number;
  j4?: number;
}

export class SphericalHarmonics {
  /**
   * Computes the perturbative gravitational acceleration due to J2 zonal harmonic oblateness.
   * r: position vector relative to the primary body's center.
   */
  public static computeJ2Acceleration(r: Vector3, params: OblatenessParams): Vector3 {
    const distSq = r.lengthSq();
    const dist = Math.sqrt(distSq);
    if (dist === 0) return new Vector3();

    const z = r.z;
    const zSq = z * z;
    const rSq = distSq;
    const req = params.radius;

    // Factor: (3/2) * J2 * mu * (Req^2 / r^5)
    const factor = 1.5 * params.j2 * params.mu * (req * req) / Math.pow(dist, 5);

    // a_x = factor * x * (5 * (z/r)^2 - 1)
    // a_y = factor * y * (5 * (z/r)^2 - 1)
    // a_z = factor * z * (5 * (z/r)^2 - 3)
    const zOverRSq = zSq / rSq;
    const ax = factor * r.x * (5 * zOverRSq - 1);
    const ay = factor * r.y * (5 * zOverRSq - 1);
    const az = factor * r.z * (5 * zOverRSq - 3);

    return new Vector3(ax, ay, az);
  }

  /**
   * Computes the nodal regression rate dOmega/dt in radians per second for circular/elliptical orbits.
   */
  public static computeNodalRegressionRate(
    semiMajorAxis: number,
    eccentricity: number,
    inclinationRad: number,
    params: OblatenessParams
  ): number {
    const p = semiMajorAxis * (1 - eccentricity * eccentricity);
    if (p <= 0) return 0;
    const n = Math.sqrt(params.mu / Math.pow(semiMajorAxis, 3));
    return -1.5 * n * params.j2 * Math.pow(params.radius / p, 2) * Math.cos(inclinationRad);
  }
}
