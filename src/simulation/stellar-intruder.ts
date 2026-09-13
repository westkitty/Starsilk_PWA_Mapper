/**
 * GAME10: Rogue Planet / Stellar Intruder Event.
 * Injects a high-velocity unbound body on a hyperbolic trajectory through the system.
 */

import { CelestialBody, Vector3D } from "./types";
import { KM_PER_AU, JUPITER_MASS_KG, JUPITER_RADIUS_KM } from "./units";

export function spawnStellarIntruder(
  targetPrimary: CelestialBody,
  impactParameterAu: number = 3.0,
  velocityKmS: number = 35.0
): CelestialBody {
  const spawnDistanceKm = 30.0 * KM_PER_AU;
  const perpOffsetKm = impactParameterAu * KM_PER_AU;

  const position: Vector3D = {
    x: spawnDistanceKm,
    y: targetPrimary.position.y + (Math.random() - 0.5) * 0.5 * KM_PER_AU,
    z: perpOffsetKm,
  };

  // Trajectory aiming near the system center
  const dx = targetPrimary.position.x - position.x;
  const dy = targetPrimary.position.y - position.y;
  const dz = targetPrimary.position.z - position.z;
  const dist = Math.hypot(dx, dy, dz);

  const velocity: Vector3D = {
    x: (dx / dist) * velocityKmS,
    y: (dy / dist) * velocityKmS,
    z: (dz / dist) * velocityKmS,
  };

  return {
    id: "intruder-" + Date.now().toString(36),
    name: "Rogue Nomad " + Math.floor(Math.random() * 900 + 100),
    type: "planet",
    massKg: JUPITER_MASS_KG * 3.5, // Super-Jupiter rogue
    radiusKm: JUPITER_RADIUS_KM * 1.4,
    position,
    velocity,
    classification: "gas_giant",
    color: "#473c52",
    albedo: 0.15,
  };
}
