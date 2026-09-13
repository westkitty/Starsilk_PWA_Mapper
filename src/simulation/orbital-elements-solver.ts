/**
 * Universal State Vector to Osculating Keplerian Orbital Elements Solver.
 * Bi-directional conversion between Cartesian state vectors (r, v) and classical orbital elements (a, e, i, Omega, omega, nu).
 */

import { Vector3 } from 'three';

export interface OrbitalElements {
  semiMajorAxis: number; // a
  eccentricity: number; // e
  inclination: number; // i (radians)
  longitudeOfAscendingNode: number; // Omega (radians)
  argumentOfPeriapsis: number; // omega (radians)
  trueAnomaly: number; // nu (radians)
  period: number; // orbital period
}

export class OrbitalElementsSolver {
  /**
   * Convert Cartesian (position, velocity) relative to primary to osculating orbital elements.
   * mu = G * (M + m)
   */
  public static cartesianToElements(
    rVec: Vector3,
    vVec: Vector3,
    mu: number
  ): OrbitalElements {
    const r = rVec.length();
    const v = vVec.length();
    if (r === 0 || mu <= 0) {
      return {
        semiMajorAxis: 0,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        trueAnomaly: 0,
        period: 0,
      };
    }

    // Specific angular momentum h = r x v
    const hVec = new Vector3().crossVectors(rVec, vVec);
    const h = hVec.length();

    // Node vector n = k x h = (-h_y, h_x, 0)
    const nVec = new Vector3(-hVec.y, hVec.x, 0);
    const n = nVec.length();

    // Eccentricity vector e = (1/mu) * ((v^2 - mu/r)*r - (r.v)*v)
    const rDotV = rVec.dot(vVec);
    const eVec = new Vector3()
      .copy(rVec)
      .multiplyScalar(v * v - mu / r)
      .sub(new Vector3().copy(vVec).multiplyScalar(rDotV))
      .multiplyScalar(1 / mu);
    const e = eVec.length();

    // Specific mechanical energy eps = v^2 / 2 - mu / r
    const eps = (v * v) / 2 - mu / r;
    let a = 0;
    if (Math.abs(eps) > 1e-12) {
      a = -mu / (2 * eps);
    }

    // Inclination i = acos(h_z / h)
    const inc = Math.acos(Math.max(-1, Math.min(1, hVec.z / (h || 1))));

    // Longitude of ascending node Omega = acos(n_x / n)
    let Omega = 0;
    if (n > 1e-12) {
      Omega = Math.acos(Math.max(-1, Math.min(1, nVec.x / n)));
      if (nVec.y < 0) Omega = 2 * Math.PI - Omega;
    }

    // Argument of periapsis omega = acos((n . e) / (n * e))
    let omega = 0;
    if (n > 1e-12 && e > 1e-8) {
      omega = Math.acos(Math.max(-1, Math.min(1, nVec.dot(eVec) / (n * e))));
      if (eVec.z < 0) omega = 2 * Math.PI - omega;
    }

    // True anomaly nu = acos((e . r) / (e * r))
    let nu = 0;
    if (e > 1e-8) {
      nu = Math.acos(Math.max(-1, Math.min(1, eVec.dot(rVec) / (e * r))));
      if (rDotV < 0) nu = 2 * Math.PI - nu;
    }

    const period = a > 0 ? 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu) : 0;

    return {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc,
      longitudeOfAscendingNode: Omega,
      argumentOfPeriapsis: omega,
      trueAnomaly: nu,
      period,
    };
  }
}
