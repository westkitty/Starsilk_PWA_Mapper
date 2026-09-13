/**
 * GAME10: Rogue Planet / Stellar Intruder Event.
 * Injects a high-velocity unbound body on a hyperbolic trajectory through the system.
 */

import { CelestialBody, Vector3D } from "./types";
import { KM_PER_AU, JUPITER_MASS_KG, JUPITER_RADIUS_KM } from "./units";

export interface StellarIntruderOptions {
  massKg?: number;
  hyperbolicExcessVelocityKmS?: number;
  periapsisDistanceKm?: number;
  targetPrimary?: CelestialBody;
}

export function spawnStellarIntruder(
  primaryOrOptions?: CelestialBody | StellarIntruderOptions,
  impactParameterAu: number = 3.0,
  velocityKmS: number = 35.0
): CelestialBody {
  let targetPrimary: CelestialBody | undefined;
  let vel = velocityKmS;
  let impactAu = impactParameterAu;
  let mass = JUPITER_MASS_KG * 3.5;

  if (primaryOrOptions && 'position' in primaryOrOptions) {
    targetPrimary = primaryOrOptions as CelestialBody;
  } else if (primaryOrOptions) {
    const opts = primaryOrOptions as StellarIntruderOptions;
    targetPrimary = opts.targetPrimary;
    if (opts.hyperbolicExcessVelocityKmS !== undefined) vel = opts.hyperbolicExcessVelocityKmS;
    if (opts.periapsisDistanceKm !== undefined) impactAu = opts.periapsisDistanceKm / KM_PER_AU;
    if (opts.massKg !== undefined) mass = opts.massKg;
  }

  const primaryPos = targetPrimary?.position || { x: 0, y: 0, z: 0 };
  const spawnDistanceKm = 30.0 * KM_PER_AU;
  const perpOffsetKm = impactAu * KM_PER_AU;

  const position: Vector3D = {
    x: spawnDistanceKm,
    y: primaryPos.y + (Math.random() - 0.5) * 0.5 * KM_PER_AU,
    z: perpOffsetKm,
  };

  const dx = primaryPos.x - position.x;
  const dy = primaryPos.y - position.y;
  const dz = primaryPos.z - position.z;
  const dist = Math.hypot(dx, dy, dz) || 1;

  const velocity: Vector3D = {
    x: (dx / dist) * vel,
    y: (dy / dist) * vel,
    z: (dz / dist) * vel,
  };

  return {
    id: "intruder-" + Date.now().toString(36),
    name: "Rogue Nomad " + Math.floor(Math.random() * 900 + 100),
    type: "planet",
    massKg: mass,
    radiusKm: JUPITER_RADIUS_KM * 1.4,
    position,
    velocity,
    classification: "gas_giant",
    color: "#473c52",
    albedo: 0.15,
  };
}
