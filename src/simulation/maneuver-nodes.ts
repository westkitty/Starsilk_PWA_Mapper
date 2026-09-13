/**
 * GAME14: Astrodynamic Maneuver Node System.
 * Places planned instantaneous Delta-V impulse burns along trajectories.
 */

import { CelestialBody, Vector3D } from "./types";

export interface ManeuverNode {
  id: string;
  bodyId?: string;
  targetBodyId?: string;
  scheduledTimeSec?: number;
  epochSeconds?: number;
  progradeDeltaVKmS?: number;
  deltaVProgradeKmS?: number;
  radialDeltaVKmS?: number;
  deltaVRadialKmS?: number;
  normalDeltaVKmS?: number;
  deltaVNormalKmS?: number;
  isExecuted?: boolean;
}

export function applyManeuverImpulse(
  currentVelocity: Vector3D,
  node: ManeuverNode
): Vector3D {
  const speed = Math.hypot(currentVelocity.x, currentVelocity.y, currentVelocity.z) || 1;
  // Unit vector along velocity (prograde)
  const prograde = {
    x: currentVelocity.x / speed,
    y: currentVelocity.y / speed,
    z: currentVelocity.z / speed,
  };
  // Unit vector perpendicular (normal)
  const normal = { x: 0, y: 1, z: 0 };
  // Radial vector (outward)
  const radial = {
    x: prograde.y * normal.z - prograde.z * normal.y,
    y: prograde.z * normal.x - prograde.x * normal.z,
    z: prograde.x * normal.y - prograde.y * normal.x,
  };

  const dVPro = node.deltaVProgradeKmS ?? node.progradeDeltaVKmS ?? 0;
  const dVRad = node.deltaVRadialKmS ?? node.radialDeltaVKmS ?? 0;
  const dVNorm = node.deltaVNormalKmS ?? node.normalDeltaVKmS ?? 0;

  return {
    x: currentVelocity.x + prograde.x * dVPro + radial.x * dVRad,
    y: currentVelocity.y + prograde.y * dVPro + radial.y * dVRad + normal.y * dVNorm,
    z: currentVelocity.z + prograde.z * dVPro + radial.z * dVRad,
  };
}

export function applyManeuverBurn(
  body: CelestialBody,
  node: ManeuverNode
): CelestialBody {
  const newVel = applyManeuverImpulse(body.velocity, node);
  return {
    ...body,
    velocity: newVel,
  };
}
