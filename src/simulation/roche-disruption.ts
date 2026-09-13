/**
 * GAME09: Roche Limit Disruption & Ring Spawner.
 * Converts bodies that breach mutual tidal disruption limits into debris rings.
 */

import { CelestialBody, RingStructure } from "./types";

export function checkAndApplyRocheDisruption(
  primary: CelestialBody,
  satellite: CelestialBody,
  distanceKm: number
): RingStructure | null {
  if (primary.massKg <= satellite.massKg) return null;
  // Rigid body Roche limit: d_r = 1.26 * R_M * (rho_M / rho_m)^(1/3)
  // Simplified density approximation:
  const rhoM = primary.massKg / (Math.pow(primary.radiusKm, 3) || 1);
  const rhom = satellite.massKg / (Math.pow(satellite.radiusKm, 3) || 1);
  const rocheLimitKm = 1.26 * primary.radiusKm * Math.cbrt(rhoM / (rhom || 1));

  if (distanceKm < rocheLimitKm) {
    // Satellite disrupts into a new ring
    const ring: RingStructure = {
      id: "ring-" + Math.random().toString(36).substring(2, 7),
      name: `${satellite.name} Debris Ring`,
      innerRadiusKm: Math.round(primary.radiusKm * 1.3),
      outerRadiusKm: Math.round(Math.max(primary.radiusKm * 1.8, distanceKm * 1.2)),
      color: satellite.color || "#c2b280",
      normal: { x: 0, y: 1, z: 0 },
      opacity: 0.75,
    };
    return ring;
  }
  return null;
}
