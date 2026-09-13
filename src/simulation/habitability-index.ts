/**
 * Planetary Habitability & Earth Similarity Index (ESI).
 * Computes multi-parameter habitability metrics comparing radius, density,
 * escape velocity, and surface temperature against Earth baselines.
 */

import { CelestialBody } from './types';

// Earth reference constants
const EARTH_RADIUS_KM = 6371.0;
const EARTH_MASS_KG = 5.972e24;
const EARTH_TEMP_K = 288.0;
const G_KM = 6.67430e-20; // km^3 / (kg * s^2)

export interface HabitabilityReport {
  esi: number; // 0.0 to 1.0 (Earth = 1.0, Mars ~ 0.70)
  surfaceGravityG: number;
  escapeVelocityKmS: number;
  densityGcm3: number;
  isHabitableZone: boolean;
  habitabilityTier: 'Optimal' | 'Sub-optimal' | 'Marginal' | 'Barren';
}

export function computeEarthSimilarityIndex(body: CelestialBody, _hostStarLuminosityW = 3.828e26): HabitabilityReport {
  const radiusRatio = body.radiusKm / EARTH_RADIUS_KM;
  const massRatio = body.massKg / EARTH_MASS_KG;

  // Volume in km^3
  const volumeKm3 = (4 / 3) * Math.PI * (body.radiusKm ** 3);
  // Density in kg/km^3 -> convert to g/cm^3 (divide by 1e12)
  const densityGcm3 = volumeKm3 > 0 ? (body.massKg / volumeKm3) / 1e12 : 5.51;

  // Surface gravity in g (Earth = 1.0)
  const surfaceGravityG = radiusRatio > 0 ? massRatio / (radiusRatio * radiusRatio) : 0;

  // Escape velocity in km/s: v_esc = sqrt(2 * G * M / R)
  const escapeVelocityKmS = body.radiusKm > 0 ? Math.sqrt((2 * G_KM * body.massKg) / body.radiusKm) : 0;

  // Surface temperature
  const tempK = body.temperatureK || 250;

  // Sub-ESI weighting factors (Schulze-Makuch et al.)
  // Radius weight: 0.57, Density: 1.07, Escape velocity: 0.70, Temperature: 5.58
  const weightR = 0.57;
  const weightD = 1.07;
  const weightV = 0.70;
  const weightT = 5.58;
  const totalWeight = weightR + weightD + weightV + weightT;

  const diffR = Math.abs((body.radiusKm - EARTH_RADIUS_KM) / (body.radiusKm + EARTH_RADIUS_KM));
  const diffD = Math.abs((densityGcm3 - 5.51) / (densityGcm3 + 5.51));
  const diffV = Math.abs((escapeVelocityKmS - 11.186) / (escapeVelocityKmS + 11.186));
  const diffT = Math.abs((tempK - EARTH_TEMP_K) / (tempK + EARTH_TEMP_K));

  const esiR = Math.max(0, 1 - diffR) ** (weightR / totalWeight);
  const esiD = Math.max(0, 1 - diffD) ** (weightD / totalWeight);
  const esiV = Math.max(0, 1 - diffV) ** (weightV / totalWeight);
  const esiT = Math.max(0, 1 - diffT) ** (weightT / totalWeight);

  const esi = Math.max(0, Math.min(1.0, esiR * esiD * esiV * esiT));

  // Habitable zone range (roughly 200 K to 320 K)
  const isHabitableZone = tempK >= 200 && tempK <= 325 && body.radiusKm > 2000 && body.radiusKm < 15000;

  let habitabilityTier: HabitabilityReport['habitabilityTier'] = 'Barren';
  if (esi >= 0.85) habitabilityTier = 'Optimal';
  else if (esi >= 0.70) habitabilityTier = 'Sub-optimal';
  else if (esi >= 0.50) habitabilityTier = 'Marginal';

  return {
    esi,
    surfaceGravityG,
    escapeVelocityKmS,
    densityGcm3,
    isHabitableZone,
    habitabilityTier,
  };
}
