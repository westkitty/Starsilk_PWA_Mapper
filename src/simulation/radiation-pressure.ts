/**
 * GAME04: Solar Radiation Pressure.
 * Computes photon momentum force (L / (4π c r^2)) on low-mass/high-area bodies.
 */

import { SOLAR_LUMINOSITY_W, SPEED_OF_LIGHT_KM_S } from "./units";
import { Vector3D } from "./types";

export function calculateRadiationPressureForce(
  distanceKm: number,
  crossSectionAreaM2: number,
  albedo: number = 0.3,
  luminosityW: number = SOLAR_LUMINOSITY_W
): number {
  if (distanceKm <= 0) return 0;

  const distanceM = distanceKm * 1000;
  const c = SPEED_OF_LIGHT_KM_S * 1000; // m/s
  // Solar radiation flux: S = L / (4 * pi * r^2)
  const flux = luminosityW / (4 * Math.PI * distanceM * distanceM);
  // Force: F = (1 + albedo) * (S * Area) / c
  return ((1 + albedo) * flux * crossSectionAreaM2) / c; // Newtons
}

export function applyRadiationPressureAcceleration(
  position: Vector3D,
  starPosition: Vector3D,
  massKg: number,
  radiusKm: number,
  albedo: number = 0.3,
  luminosityW: number = SOLAR_LUMINOSITY_W
): Vector3D {
  const dx = position.x - starPosition.x;
  const dy = position.y - starPosition.y;
  const dz = position.z - starPosition.z;
  const distKm = Math.hypot(dx, dy, dz);
  if (distKm <= 0 || massKg <= 0) return { x: 0, y: 0, z: 0 };

  const areaM2 = Math.PI * Math.pow(radiusKm * 1000, 2);
  const forceN = calculateRadiationPressureForce(distKm, areaM2, albedo, luminosityW);
  const accelM_S2 = forceN / massKg;
  const accelKm_S2 = accelM_S2 / 1000;

  return {
    x: (dx / distKm) * accelKm_S2,
    y: (dy / distKm) * accelKm_S2,
    z: (dz / distKm) * accelKm_S2,
  };
}
