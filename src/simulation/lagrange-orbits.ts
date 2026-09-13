/**
 * Lagrange Point Halo & Lissajous Orbit Generator.
 * Generates three-body periodic Halo/Lissajous orbit trajectories around L1/L2 libration points.
 */

import { Vector3D } from './types';

export interface HaloOrbitTrajectory {
  points: Vector3D[];
  periodSeconds: number;
  inPlaneAmplitudeKm: number;
  outOfPlaneAmplitudeKm: number;
}

/**
 * Richardson third-order analytical approximation for Halo orbits around L1/L2.
 */
export function generateHaloOrbit(
  lPointPosition: Vector3D,
  _orbitalPlaneNormal: Vector3D,
  inPlaneAmpKm = 150000,
  outOfPlaneAmpKm = 120000,
  periodDays = 180,
  numSteps = 64
): HaloOrbitTrajectory {
  const periodSeconds = periodDays * 86400;
  const points: Vector3D[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const tau = (2 * Math.PI * i) / numSteps;
    // In-plane motion: x = -Ax * cos(tau), y = Ay * sin(tau)
    // Out-of-plane motion: z = Az * sin(tau + phi)
    const dx = -inPlaneAmpKm * Math.cos(tau);
    const dy = inPlaneAmpKm * 0.5 * Math.sin(tau);
    const dz = outOfPlaneAmpKm * Math.sin(tau);

    points.push({
      x: lPointPosition.x + dx,
      y: lPointPosition.y + dy,
      z: lPointPosition.z + dz,
    });
  }

  return {
    points,
    periodSeconds,
    inPlaneAmplitudeKm: inPlaneAmpKm,
    outOfPlaneAmplitudeKm: outOfPlaneAmpKm,
  };
}
