/**
 * Planetary Ring Particle Dynamics & Shepherd Moon Resonances.
 * Models viscous damping, ring spreading, and shepherd moon gap maintenance (e.g. Encke / Keeler divisions).
 */

import { Vector3D } from './types';

export interface RingShepherdMoon {
  name: string;
  semiMajorAxisKm: number;
  massKg: number;
}

export interface RingBoundaryState {
  innerEdgeKm: number;
  outerEdgeKm: number;
  opticalDepth: number; // 0.1 to 2.0
  shepherdMoons: RingShepherdMoon[];
  confinementTorqueNm: number;
}

/**
 * Calculates torque exerted by a shepherd moon on a ring boundary (Goldreich & Tremaine 1982).
 * Torque T ~ G^2 * m_moon^2 * sigma * a / (delta_a^3 * Omega)
 */
export function calculateShepherdTorque(
  ringRadiusKm: number,
  moonRadiusKm: number,
  moonMassKg: number,
  centralMassKg: number,
  surfaceDensityKgKm2 = 5e10
): number {
  const deltaA = Math.abs(moonRadiusKm - ringRadiusKm);
  if (deltaA < 100) return 0; // Avoid division by zero

  const G = 6.67430e-20;
  // Angular velocity Omega = sqrt(G * M / r^3)
  const omega = Math.sqrt((G * centralMassKg) / Math.pow(ringRadiusKm, 3));

  // Torques repel ring particles away from the moon's orbit
  const torque = (G * G * moonMassKg * moonMassKg * surfaceDensityKgKm2 * ringRadiusKm) /
                 (Math.pow(deltaA, 3) * Math.max(1e-9, omega));

  return torque;
}

/**
 * Applies inelastic collision restitution between ring particles,
 * collapsing out-of-plane inclinations and dampening eccentricities towards a razor-thin disk.
 */
export function dampRingVelocityDispersion(
  velocity: Vector3D,
  orbitalPlaneNormal: Vector3D = { x: 0, y: 0, z: 1 },
  dampingCoefficient = 0.98
): Vector3D {
  // Separate velocity into in-plane and normal components
  const normalDot = velocity.x * orbitalPlaneNormal.x +
                    velocity.y * orbitalPlaneNormal.y +
                    velocity.z * orbitalPlaneNormal.z;

  // Damp vertical velocity component towards equatorial plane
  return {
    x: velocity.x - (1 - dampingCoefficient) * normalDot * orbitalPlaneNormal.x,
    y: velocity.y - (1 - dampingCoefficient) * normalDot * orbitalPlaneNormal.y,
    z: velocity.z - (1 - dampingCoefficient) * normalDot * orbitalPlaneNormal.z,
  };
}
