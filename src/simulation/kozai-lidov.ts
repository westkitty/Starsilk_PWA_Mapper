/**
 * Kozai-Lidov Oscillation Simulator.
 * Models secular 3-body gravitational resonance cycling orbital eccentricity and inclination.
 */

export interface KozaiLidovParameters {
  innerSemiMajorAxisKm: number;
  outerSemiMajorAxisKm: number;
  innerPeriodDays: number;
  outerPeriodDays: number;
  centralMassKg: number;
  perturberMassKg: number;
  initialEccentricity: number;
  initialInclinationDeg: number;
}

export interface KozaiLidovState {
  isResonant: boolean;
  criticalInclinationDeg: number;
  timescaleYears: number;
  maxEccentricity: number;
  minInclinationDeg: number;
  conservedKozaiIntegral: number;
}

export const CRITICAL_KOZAI_INCLINATION_DEG = 39.2315; // acos(sqrt(3/5))

export function evaluateKozaiLidov(params: KozaiLidovParameters): KozaiLidovState {
  const iRad = (params.initialInclinationDeg * Math.PI) / 180;
  const e = Math.max(0, Math.min(0.999, params.initialEccentricity));
  const cosI = Math.cos(iRad);

  // Conserved Kozai component of angular momentum: C_K = (1 - e^2) * cos^2(i)
  const conservedKozaiIntegral = (1 - e * e) * cosI * cosI;

  const isResonant = params.initialInclinationDeg >= CRITICAL_KOZAI_INCLINATION_DEG &&
                     params.initialInclinationDeg <= (180 - CRITICAL_KOZAI_INCLINATION_DEG);

  // Kozai timescale: P_kozai ~ (P_out^2 / P_in) * (M_central / M_perturber) * (1 - e_out^2)^(3/2)
  const periodRatio = (params.outerPeriodDays * params.outerPeriodDays) / Math.max(1, params.innerPeriodDays);
  const massRatio = params.centralMassKg / Math.max(1, params.perturberMassKg);
  const timescaleDays = periodRatio * massRatio;
  const timescaleYears = timescaleDays / 365.25;

  let maxEccentricity = e;
  let minInclinationDeg = params.initialInclinationDeg;

  if (isResonant) {
    // Maximum eccentricity occurs when inclination drops to critical value
    maxEccentricity = Math.sqrt(Math.max(0, 1 - (5 / 3) * cosI * cosI));
    minInclinationDeg = (Math.acos(Math.sqrt(conservedKozaiIntegral)) * 180) / Math.PI;
  }

  return {
    isResonant,
    criticalInclinationDeg: CRITICAL_KOZAI_INCLINATION_DEG,
    timescaleYears,
    maxEccentricity,
    minInclinationDeg,
    conservedKozaiIntegral,
  };
}
