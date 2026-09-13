/**
 * Automated Snapshot & Invariant Regression Evaluator.
 * Verifies mechanical energy (E = K + U) and angular momentum (L) conservation
 * across numerical integrations.
 */

import { CelestialBody } from '../simulation/types';
import { integrateStep } from '../simulation/integrator';

const G = 6.67430e-20; // km^3 / (kg * s^2)

export interface InvariantConservationReport {
  initialEnergy: number;
  finalEnergy: number;
  energyDriftRelative: number;
  initialAngularMomentumMag: number;
  finalAngularMomentumMag: number;
  momentumDriftRelative: number;
  passed: boolean;
}

export function evaluateSystemEnergy(bodies: CelestialBody[]): number {
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    const vSq = bi.velocity.x ** 2 + bi.velocity.y ** 2 + bi.velocity.z ** 2;
    kinetic += 0.5 * bi.massKg * vSq;

    for (let j = i + 1; j < bodies.length; j++) {
      const bj = bodies[j];
      const dx = bj.position.x - bi.position.x;
      const dy = bj.position.y - bi.position.y;
      const dz = bj.position.z - bi.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0) {
        potential -= (G * bi.massKg * bj.massKg) / dist;
      }
    }
  }

  return kinetic + potential;
}

export function evaluateTotalAngularMomentum(bodies: CelestialBody[]): number {
  let lx = 0;
  let ly = 0;
  let lz = 0;

  for (const b of bodies) {
    const cx = b.position.y * b.velocity.z - b.position.z * b.velocity.y;
    const cy = b.position.z * b.velocity.x - b.position.x * b.velocity.z;
    const cz = b.position.x * b.velocity.y - b.position.y * b.velocity.x;

    lx += b.massKg * cx;
    ly += b.massKg * cy;
    lz += b.massKg * cz;
  }

  return Math.sqrt(lx * lx + ly * ly + lz * lz);
}

export function verifyConservationOverSteps(
  initialBodies: CelestialBody[],
  dtSeconds: number,
  steps: number,
  tolerance = 1e-4
): InvariantConservationReport {
  let current = initialBodies.map(b => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
  }));

  const e0 = evaluateSystemEnergy(current);
  const l0 = evaluateTotalAngularMomentum(current);

  for (let s = 0; s < steps; s++) {
    current = integrateStep(current, dtSeconds);
  }

  const e1 = evaluateSystemEnergy(current);
  const l1 = evaluateTotalAngularMomentum(current);

  const energyDrift = Math.abs(e0) > 1e-10 ? Math.abs((e1 - e0) / e0) : Math.abs(e1 - e0);
  const momentumDrift = Math.abs(l0) > 1e-10 ? Math.abs((l1 - l0) / l0) : Math.abs(l1 - l0);

  return {
    initialEnergy: e0,
    finalEnergy: e1,
    energyDriftRelative: energyDrift,
    initialAngularMomentumMag: l0,
    finalAngularMomentumMag: l1,
    momentumDriftRelative: momentumDrift,
    passed: energyDrift < tolerance && momentumDrift < tolerance,
  };
}
