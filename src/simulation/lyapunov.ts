/**
 * Fast Lyapunov Indicator (FLI) Chaos Detector.
 * Measures the exponential divergence rate between twin shadow orbits to detect dynamical chaos.
 */

import { CelestialBody } from './types';
import { integrateStep } from './integrator';

export interface ChaosDiagnostics {
  fliValue: number; // log(d(t) / d(0))
  isChaotic: boolean;
  divergenceRate: number;
  stepsEvaluated: number;
}

/**
 * Perturbs a body's position by an infinitesimal vector (e.g. 1 mm = 1e-6 km)
 * and measures the logarithmic growth of separation after N integration steps.
 */
export function evaluateFastLyapunovIndicator(
  bodies: CelestialBody[],
  targetBodyId: string,
  dtSeconds: number,
  steps = 50,
  initialPerturbationKm = 1e-6
): ChaosDiagnostics {
  const baseBodies = bodies.map(b => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
  }));

  const shadowBodies = bodies.map(b => {
    const clone = {
      ...b,
      position: { ...b.position },
      velocity: { ...b.velocity },
    };
    if (b.id === targetBodyId) {
      clone.position.x += initialPerturbationKm;
    }
    return clone;
  });

  let currentBase = baseBodies;
  let currentShadow = shadowBodies;

  for (let s = 0; s < steps; s++) {
    currentBase = integrateStep(currentBase, dtSeconds);
    currentShadow = integrateStep(currentShadow, dtSeconds);
  }

  const targetBase = currentBase.find(b => b.id === targetBodyId);
  const targetShadow = currentShadow.find(b => b.id === targetBodyId);

  if (!targetBase || !targetShadow) {
    return {
      fliValue: 0,
      isChaotic: false,
      divergenceRate: 1.0,
      stepsEvaluated: steps,
    };
  }

  const dx = targetShadow.position.x - targetBase.position.x;
  const dy = targetShadow.position.y - targetBase.position.y;
  const dz = targetShadow.position.z - targetBase.position.z;
  const finalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const ratio = finalDist / initialPerturbationKm;
  const fli = Math.log10(Math.max(1, ratio));

  // If shadow orbit diverged exponentially (e.g. ratio > 100 in 50 steps), flag as chaotic
  const isChaotic = fli > 2.0;

  return {
    fliValue: fli,
    isChaotic,
    divergenceRate: ratio,
    stepsEvaluated: steps,
  };
}
