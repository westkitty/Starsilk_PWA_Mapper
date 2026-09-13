/**
 * GAME03: Tidal Circularization & Locking Physics.
 * Models long-term tidal eccentricity dampening and rotation-synchronization timescales.
 */
export function computeTidalLockingTimescaleYears(
  planetMassKg: number,
  satelliteMassKg: number,
  satelliteRadiusKm: number,
  semiMajorAxisKm: number,
  tidalQ: number = 100
): number {
  if (semiMajorAxisKm <= 0 || planetMassKg <= 0 || satelliteMassKg <= 0) return Infinity;
  const a = semiMajorAxisKm * 1000;
  const r = satelliteRadiusKm * 1000;
  const G = 6.6743e-11;
  const k2 = 0.3;
  const seconds = (4.0 / 9.0) * (tidalQ * Math.pow(a, 6) * r) / (G * Math.pow(planetMassKg, 2) * k2 * 1e18);
  return seconds / (86400 * 365.25);
}

export function applyTidalCircularization(
  eccentricity: number,
  semiMajorAxisKm: number,
  dtYears: number,
  baseTauYears: number = 1e7
): number {
  if (eccentricity <= 0.001) return 0.001;
  // Scaled circularization timescale: tau ~ a^(21/2)
  const tauCircYears = baseTauYears * Math.max(0.1, Math.min(10, semiMajorAxisKm / 384400));
  const decayRate = dtYears / tauCircYears;
  return Math.max(0.0001, eccentricity * Math.exp(-decayRate));
}
