/**
 * High-Precision Universal Kepler Anomaly Solver.
 * Solves Kepler's equation M = E - e * sin(E) for eccentric anomaly E,
 * and hyperbolic Kepler's equation M = e * sinh(H) - H for hyperbolic anomaly H.
 */

export interface KeplerSolution {
  eccentricAnomalyRad: number;
  trueAnomalyRad: number;
  iterations: number;
  converged: boolean;
}

/**
 * Solves elliptic Kepler's equation M = E - e*sin(E) using Newton-Raphson with cubic Halley correction.
 */
export function solveEllipticKepler(meanAnomalyRad: number, eccentricity: number, tol = 1e-12, maxIter = 50): KeplerSolution {
  // Normalize M to [0, 2*PI)
  let M = meanAnomalyRad % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;

  // Good initial guess
  let E = eccentricity < 0.8 ? M : Math.PI;
  let iter = 0;
  let converged = false;

  for (; iter < maxIter; iter++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - eccentricity * sinE - M;
    const fPrime = 1 - eccentricity * cosE;
    const fDoublePrime = eccentricity * sinE;

    // Halley's rational correction step
    const delta = f / (fPrime - (f * fDoublePrime) / (2 * fPrime));
    E -= delta;

    if (Math.abs(delta) < tol) {
      converged = true;
      break;
    }
  }

  // Calculate True Anomaly nu from E
  const sinNuHalf = Math.sqrt(1 + eccentricity) * Math.sin(E / 2);
  const cosNuHalf = Math.sqrt(1 - eccentricity) * Math.cos(E / 2);
  let trueAnomaly = 2 * Math.atan2(sinNuHalf, cosNuHalf);
  if (trueAnomaly < 0) trueAnomaly += 2 * Math.PI;

  return {
    eccentricAnomalyRad: E,
    trueAnomalyRad: trueAnomaly,
    iterations: iter,
    converged,
  };
}

/**
 * Solves hyperbolic Kepler's equation M = e*sinh(H) - H for e > 1.
 */
export function solveHyperbolicKepler(meanAnomalyRad: number, eccentricity: number, tol = 1e-12, maxIter = 50): KeplerSolution {
  let H = meanAnomalyRad / (eccentricity - 1);
  let iter = 0;
  let converged = false;

  for (; iter < maxIter; iter++) {
    const sinhH = Math.sinh(H);
    const coshH = Math.cosh(H);
    const f = eccentricity * sinhH - H - meanAnomalyRad;
    const fPrime = eccentricity * coshH - 1;
    const delta = f / fPrime;
    H -= delta;

    if (Math.abs(delta) < tol) {
      converged = true;
      break;
    }
  }

  const trueAnomaly = 2 * Math.atan(Math.sqrt((eccentricity + 1) / (eccentricity - 1)) * Math.tanh(H / 2));

  return {
    eccentricAnomalyRad: H,
    trueAnomalyRad: trueAnomaly,
    iterations: iter,
    converged,
  };
}
