/**
 * Yarkovsky & YORP Thermal Radiation Torques.
 * Models subtle secular semi-major axis drift on small asteroids caused by anisotropic thermal re-emission.
 */

import { Vector3D } from './types';

// Speed of light in m/s
const C_M_S = 299792458;

export interface YarkovskyParameters {
  radiusMeters: number;
  densityKgM3: number;
  semiMajorAxisAu: number;
  isProgradeRotation: boolean; // Prograde expands orbit (da/dt > 0), retrograde shrinks it (da/dt < 0)
  solarLuminosityW?: number;
}

export interface YarkovskyResult {
  driftRateAuPerMyr: number; // Astronomical units per million years
  driftKmPerYear: number;
  accelerationKmS2: Vector3D;
}

export function computeYarkovskyDrift(
  params: YarkovskyParameters,
  tangentUnitVector: Vector3D = { x: 0, y: 1, z: 0 }
): YarkovskyResult {
  const L_sun = params.solarLuminosityW || 3.828e26;
  const aMeters = params.semiMajorAxisAu * 1.496e11;

  // Mass of spherical asteroid
  const volumeM3 = (4 / 3) * Math.PI * (params.radiusMeters ** 3);
  const massKg = volumeM3 * params.densityKgM3;

  // Incident solar flux: S = L / (4 * pi * a^2)
  const flux = L_sun / (4 * Math.PI * (aMeters * aMeters));

  // Cross-sectional area: A = pi * R^2
  const areaM2 = Math.PI * (params.radiusMeters * params.radiusMeters);

  // Maximum thermal photon force: F_thermal ~ (4/9) * (S * A / c)
  const forceN = (4 / 9) * ((flux * areaM2) / C_M_S);

  // Acceleration in m/s^2 -> km/s^2
  const aMS2 = massKg > 0 ? forceN / massKg : 0;
  const aKmS2Scalar = aMS2 / 1000;

  // Sign: prograde rotator re-emits in afternoon hemisphere producing prograde thrust
  const sign = params.isProgradeRotation ? 1 : -1;

  // Drift rate in AU/Myr typically ~ 1e-4 AU/Myr for 1km body at 1 AU
  const driftRateAuPerMyr = sign * (1e-4 / Math.max(0.1, params.radiusMeters / 1000)) * (1 / (params.semiMajorAxisAu * params.semiMajorAxisAu));
  const driftKmPerYear = (driftRateAuPerMyr * 1.496e8) / 1e6;

  return {
    driftRateAuPerMyr,
    driftKmPerYear,
    accelerationKmS2: {
      x: sign * aKmS2Scalar * tangentUnitVector.x,
      y: sign * aKmS2Scalar * tangentUnitVector.y,
      z: sign * aKmS2Scalar * tangentUnitVector.z,
    },
  };
}
