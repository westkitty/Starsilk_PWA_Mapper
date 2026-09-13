/**
 * Relativistic Post-Newtonian (1PN) Precession.
 * Simulates Einstein's general relativistic correction to Newtonian gravity,
 * reproducing the anomalous perihelion advance of Mercury and relativistic precession around compact primaries.
 */

import { Vector3D } from './types';

// Speed of light in km/s
export const SPEED_OF_LIGHT_KM_S = 299792.458;
const C2 = SPEED_OF_LIGHT_KM_S * SPEED_OF_LIGHT_KM_S;
const G_KM = 6.67430e-20; // km^3 / (kg * s^2)

/**
 * Calculates the 1PN perturbative acceleration vector (km/s^2) exerted on a test mass by a primary star/black hole.
 */
export function calculate1PNAcceleration(
  primaryMassKg: number,
  relPos: Vector3D,
  relVel: Vector3D
): Vector3D {
  const r2 = relPos.x * relPos.x + relPos.y * relPos.y + relPos.z * relPos.z;
  const r = Math.sqrt(r2);
  if (r < 1.0) return { x: 0, y: 0, z: 0 };

  const v2 = relVel.x * relVel.x + relVel.y * relVel.y + relVel.z * relVel.z;
  const rDotV = relPos.x * relVel.x + relPos.y * relVel.y + relPos.z * relVel.z;
  const mu = G_KM * primaryMassKg;

  // 1PN acceleration term: a_1pn = (mu / (c^2 * r^3)) * [ (4*mu/r - v^2)*r + 4*(r.v)*v ]
  const scalarPrefactor = mu / (C2 * r * r2);
  const rCoeff = (4 * mu) / r - v2;
  const vCoeff = 4 * rDotV;

  return {
    x: scalarPrefactor * (rCoeff * relPos.x + vCoeff * relVel.x),
    y: scalarPrefactor * (rCoeff * relPos.y + vCoeff * relVel.y),
    z: scalarPrefactor * (rCoeff * relPos.z + vCoeff * relVel.z),
  };
}

/**
 * Analytical perihelion advance per orbit in radians:
 * dPhi = (6 * pi * G * M) / (a * (1 - e^2) * c^2)
 */
export function calculatePerihelionAdvanceRad(
  primaryMassKg: number,
  semiMajorAxisKm: number,
  eccentricity: number
): number {
  if (semiMajorAxisKm <= 0 || eccentricity >= 1.0) return 0;
  const mu = G_KM * primaryMassKg;
  const denom = semiMajorAxisKm * (1 - eccentricity * eccentricity) * C2;
  return (6 * Math.PI * mu) / denom;
}
