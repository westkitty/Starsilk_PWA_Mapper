/**
 * Atmospheric Drag & Orbital Decay Engine.
 * Calculates aerodynamic deceleration and altitude loss for low-orbiting satellites.
 */

import { Vector3D } from './types';

export interface AtmosphericProfile {
  scaleHeightKm: number;
  seaLevelDensityKgM3: number;
  atmosphereCeilingKm: number;
}

export const DEFAULT_TERRESTRIAL_ATMOSPHERE: AtmosphericProfile = {
  scaleHeightKm: 8.5,
  seaLevelDensityKgM3: 1.225,
  atmosphereCeilingKm: 800.0,
};

/**
 * Calculates atmospheric drag acceleration vector in km/s^2.
 */
export function calculateAtmosphericDrag(
  altitudeKm: number,
  velocityKmS: Vector3D,
  spacecraftMassKg: number,
  crossSectionalAreaM2 = 10.0,
  dragCoefficient = 2.2,
  profile = DEFAULT_TERRESTRIAL_ATMOSPHERE
): Vector3D {
  if (altitudeKm <= 0 || altitudeKm > profile.atmosphereCeilingKm || spacecraftMassKg <= 0) {
    return { x: 0, y: 0, z: 0 };
  }

  // Exponential barometric density formula: rho(h) = rho_0 * exp(-h / H)
  const densityKgM3 = profile.seaLevelDensityKgM3 * Math.exp(-altitudeKm / profile.scaleHeightKm);

  // Velocity magnitude in m/s
  const speedKmS = Math.sqrt(
    velocityKmS.x * velocityKmS.x +
    velocityKmS.y * velocityKmS.y +
    velocityKmS.z * velocityKmS.z
  );
  if (speedKmS <= 0) return { x: 0, y: 0, z: 0 };

  const speedMS = speedKmS * 1000;

  // Drag force in Newtons: F_d = 0.5 * rho * v^2 * C_d * A
  const dragForceN = 0.5 * densityKgM3 * (speedMS * speedMS) * dragCoefficient * crossSectionalAreaM2;

  // Acceleration in m/s^2 -> convert to km/s^2 (divide by 1000)
  const aDragKmS2 = (dragForceN / spacecraftMassKg) / 1000;

  // Opposes velocity vector
  const unitVx = velocityKmS.x / speedKmS;
  const unitVy = velocityKmS.y / speedKmS;
  const unitVz = velocityKmS.z / speedKmS;

  return {
    x: -aDragKmS2 * unitVx,
    y: -aDragKmS2 * unitVy,
    z: -aDragKmS2 * unitVz,
  };
}

/**
 * Analytical estimate of remaining orbital lifetime in days for circular low orbit.
 */
export function estimateOrbitalLifetimeDays(
  altitudeKm: number,
  satelliteMassKg: number,
  areaM2 = 10.0,
  profile = DEFAULT_TERRESTRIAL_ATMOSPHERE
): number {
  if (altitudeKm < 120) return 0.1;
  if (altitudeKm > profile.atmosphereCeilingKm) return Infinity;

  // Simplified decay model: higher altitude yields exponential lifetime
  const factor = Math.exp((altitudeKm - 200) / profile.scaleHeightKm);
  return (factor * (satelliteMassKg / (areaM2 * 100))) / 86400;
}
