/**
 * Mass Evolution & Stellar Wind Loss.
 * Models secular stellar mass loss (solar wind, coronal mass ejections)
 * and its adiabatic effect on planetary orbital radii: r(t) * M(t) = constant.
 */

import { CelestialBody } from './types';

// Solar mass in kg
const SOLAR_MASS_KG = 1.989e30;
// Baseline solar wind mass loss rate: ~2e-14 Solar Masses per year
const DEFAULT_MASS_LOSS_RATE_KG_PER_SEC = (2e-14 * SOLAR_MASS_KG) / (365.25 * 86400);

export interface StellarMassEvolutionStep {
  deltaMassKg: number;
  newStarMassKg: number;
  fractionalRadiusExpansion: number;
}

export function computeStellarMassLoss(
  starMassKg: number,
  dtSeconds: number,
  massLossRateKgPerSec = DEFAULT_MASS_LOSS_RATE_KG_PER_SEC
): StellarMassEvolutionStep {
  const deltaMass = -massLossRateKgPerSec * dtSeconds;
  const newMass = Math.max(1e28, starMassKg + deltaMass);

  // In adiabatic mass loss, a * M = const => a_new / a_old = M_old / M_new
  const fractionalRadiusExpansion = starMassKg / newMass;

  return {
    deltaMassKg: deltaMass,
    newStarMassKg: newMass,
    fractionalRadiusExpansion,
  };
}

/**
 * Accrete mass onto a celestial body from collisions or dust cloud capture.
 */
export function accreteMass(
  targetBody: CelestialBody,
  accretedMassKg: number,
  accretedDensityGcm3 = 3.0
): CelestialBody {
  const newMass = targetBody.massKg + accretedMassKg;
  // Volume scale: V_new = V_old + V_added
  const addedVolumeKm3 = (accretedMassKg / (accretedDensityGcm3 * 1e12));
  const oldVolumeKm3 = (4 / 3) * Math.PI * (targetBody.radiusKm ** 3);
  const newVolumeKm3 = oldVolumeKm3 + addedVolumeKm3;
  const newRadiusKm = Math.cbrt(newVolumeKm3 / ((4 / 3) * Math.PI));

  return {
    ...targetBody,
    massKg: newMass,
    radiusKm: newRadiusKm,
  };
}
