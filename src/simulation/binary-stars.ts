/**
 * Binary & Multiple Star System Dynamics.
 * Implements Holman-Wiegert dynamical stability limits for circumbinary (P-type)
 * and circumstellar (S-type) planetary orbits.
 */

export interface BinaryStarPair {
  star1MassKg: number;
  star2MassKg: number;
  separationKm: number;
  eccentricity: number;
}

export interface BinaryStabilityLimits {
  barycenterOffsetKm: number; // Distance from Star 1 to barycenter
  criticalCircumbinaryRadiusKm: number; // Inner stable limit for P-type planets
  criticalCircumstellarRadius1Km: number; // Outer stable limit around Star 1 for S-type planets
  criticalCircumstellarRadius2Km: number; // Outer stable limit around Star 2 for S-type planets
}

/**
 * Calculates Holman & Wiegert (1999) critical orbital stability limits.
 */
export function calculateBinaryStabilityLimits(pair: BinaryStarPair): BinaryStabilityLimits {
  const m1 = pair.star1MassKg;
  const m2 = pair.star2MassKg;
  const mTotal = m1 + m2;
  const mu = m2 / mTotal; // Mass ratio (0 <= mu <= 0.5)
  const a = pair.separationKm;
  const e = Math.max(0, Math.min(0.9, pair.eccentricity));

  // Barycenter position along separation axis (distance from Star 1)
  const barycenterOffsetKm = a * (m2 / mTotal);

  // Critical inner semi-major axis for P-type (circumbinary) planets:
  // a_c = a * (1.60 + 5.10*e - 2.22*e^2 + 4.12*mu - 4.27*e*mu - 5.09*mu^2 + 4.61*e^2*mu^2)
  const aCritP = a * (
    1.60 + 5.10 * e - 2.22 * e * e +
    4.12 * mu - 4.27 * e * mu - 5.09 * mu * mu +
    4.61 * e * e * mu * mu
  );

  // Critical outer semi-major axis for S-type (around Star 1):
  // a_c1 = a * (0.464 - 0.380*mu - 0.631*e + 0.586*mu*e + 0.150*e^2 - 0.198*mu*e^2)
  const aCritS1 = a * (
    0.464 - 0.380 * mu - 0.631 * e +
    0.586 * mu * e + 0.150 * e * e - 0.198 * mu * e * e
  );

  // Around Star 2: replace mu with (1 - mu)
  const mu2 = 1 - mu;
  const aCritS2 = a * (
    0.464 - 0.380 * mu2 - 0.631 * e +
    0.586 * mu2 * e + 0.150 * e * e - 0.198 * mu2 * e * e
  );

  return {
    barycenterOffsetKm,
    criticalCircumbinaryRadiusKm: Math.max(a * 1.5, aCritP),
    criticalCircumstellarRadius1Km: Math.max(0, aCritS1),
    criticalCircumstellarRadius2Km: Math.max(0, aCritS2),
  };
}
