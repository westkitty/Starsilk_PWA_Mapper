/**
 * GAME02: Gravitational Slingshot Tracker.
 * Analyzes hyperbolic flybys that alter heliocentric velocity vectors.
 */

import { Vector3D } from "./types";

export interface SlingshotEvent {
  bodyId: string;
  primaryId: string;
  periapsisDistanceKm: number;
  initialSpeedKmS: number;
  finalSpeedKmS: number;
  deltaVKmS: number;
  turnAngleDeg: number;
}

export function calculateGravityAssistDeltaV(
  vIn: Vector3D,
  vOut: Vector3D,
  vPrimary: Vector3D
): { deltaV: number; deflectionDeg: number } {
  // Heliocentric velocities before and after
  const vInHelio = { x: vIn.x, y: vIn.y, z: vIn.z };
  const vOutHelio = { x: vOut.x, y: vOut.y, z: vOut.z };

  const speedIn = Math.hypot(vInHelio.x, vInHelio.y, vInHelio.z);
  const speedOut = Math.hypot(vOutHelio.x, vOutHelio.y, vOutHelio.z);
  const deltaV = speedOut - speedIn;

  // Turn angle between incoming and outgoing asymptotic velocity vectors relative to primary
  const vRelIn = { x: vIn.x - vPrimary.x, y: vIn.y - vPrimary.y, z: vIn.z - vPrimary.z };
  const vRelOut = { x: vOut.x - vPrimary.x, y: vOut.y - vPrimary.y, z: vOut.z - vPrimary.z };
  const magIn = Math.hypot(vRelIn.x, vRelIn.y, vRelIn.z);
  const magOut = Math.hypot(vRelOut.x, vRelOut.y, vRelOut.z);

  let dot = (vRelIn.x * vRelOut.x + vRelIn.y * vRelOut.y + vRelIn.z * vRelOut.z) / (magIn * magOut || 1);
  dot = Math.max(-1, Math.min(1, dot));
  const deflectionDeg = (Math.acos(dot) * 180) / Math.PI;

  return { deltaV, deflectionDeg };
}
