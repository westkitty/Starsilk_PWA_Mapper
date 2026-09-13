/**
 * NASA SPK / Chebyshev Polynomial Ephemeris Evaluator.
 * Evaluates position and velocity state vectors from Chebyshev segment coefficients.
 */

import { Vector3 } from 'three';

export interface ChebyshevSegment {
  bodyId: number;
  centerId: number;
  startTime: number;
  endTime: number;
  degree: number; // Polynomial degree N (coefficients count = N + 1)
  xCoeffs: number[];
  yCoeffs: number[];
  zCoeffs: number[];
}

export class SPKEphemerisEvaluator {
  /**
   * Evaluate Chebyshev polynomials of the first kind T_n(t) for normalized time tau in [-1, 1].
   */
  public static evaluateChebyshev(coeffs: number[], tau: number): number {
    if (coeffs.length === 0) return 0;
    if (coeffs.length === 1) return coeffs[0];

    // Clenshaw recurrence algorithm
    let b1 = 0;
    let b2 = 0;
    const twoTau = 2 * tau;

    for (let i = coeffs.length - 1; i >= 1; i--) {
      const b0 = coeffs[i] + twoTau * b1 - b2;
      b2 = b1;
      b1 = b0;
    }

    return coeffs[0] + tau * b1 - b2;
  }

  /**
   * Evaluate 3D position vector from segment at epoch time t.
   */
  public static evaluatePosition(segment: ChebyshevSegment, t: number): Vector3 {
    const clampedT = Math.max(segment.startTime, Math.min(segment.endTime, t));
    const span = segment.endTime - segment.startTime;
    const tau = span > 0 ? (2 * (clampedT - segment.startTime)) / span - 1 : 0;

    const x = this.evaluateChebyshev(segment.xCoeffs, tau);
    const y = this.evaluateChebyshev(segment.yCoeffs, tau);
    const z = this.evaluateChebyshev(segment.zCoeffs, tau);

    return new Vector3(x, y, z);
  }
}
