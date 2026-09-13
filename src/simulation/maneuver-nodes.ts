/**
 * GAME14: Astrodynamic Maneuver Node System.
 * Places planned instantaneous Delta-V impulse burns along trajectories.
 */

import { Vector3D } from "./types";

export interface ManeuverNode {
  id: string;
  bodyId: string;
  scheduledTimeSec: number;
  progradeDeltaVKmS: number;
  radialDeltaVKmS: number;
  normalDeltaVKmS: number;
  isExecuted: boolean;
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

  return {
    x: currentVelocity.x + prograde.x * node.progradeDeltaVKmS + radial.x * node.radialDeltaVKmS,
    y: currentVelocity.y + prograde.y * node.progradeDeltaVKmS + radial.y * node.radialDeltaVKmS + normal.y * node.normalDeltaVKmS,
    z: currentVelocity.z + prograde.z * node.progradeDeltaVKmS + radial.z * node.radialDeltaVKmS,
  };
}
