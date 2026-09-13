/**
 * Interstellar Flyby & Hyperbolic Capture Engine.
 * Evaluates whether an unbound hyperbolic object can be captured into a bound orbit
 * through gravitational three-body energy exchange or tidal dissipation.
 */

import { Vector3D } from './types';

const G_KM = 6.67430e-20; // km^3 / (kg * s^2)

export interface CaptureEvaluation {
  isCaptured: boolean;
  initialSpecificEnergy: number; // km^2 / s^2 (positive for unbound)
  postEncounterSpecificEnergy: number;
  deltaVRequiredForCaptureKmS: number;
  periapsisDistanceKm: number;
  mechanism: 'tidal_dissipation' | 'three_body_exchange' | 'insufficient_energy_loss';
}

export function evaluateHyperbolicCapture(
  intruderPos: Vector3D,
  intruderVel: Vector3D,
  primaryMassKg: number,
  primaryRadiusKm: number,
  secondaryPlanetMassKg = 0,
  secondaryPlanetPos?: Vector3D
): CaptureEvaluation {
  const r = Math.sqrt(intruderPos.x ** 2 + intruderPos.y ** 2 + intruderPos.z ** 2);
  const v = Math.sqrt(intruderVel.x ** 2 + intruderVel.y ** 2 + intruderVel.z ** 2);

  // Specific orbital energy: epsilon = v^2 / 2 - G*M / r
  const mu = G_KM * primaryMassKg;
  const initialEnergy = 0.5 * (v * v) - mu / Math.max(1, r);

  // Angular momentum magnitude: h = |r x v|
  const hx = intruderPos.y * intruderVel.z - intruderPos.z * intruderVel.y;
  const hy = intruderPos.z * intruderVel.x - intruderPos.x * intruderVel.z;
  const hz = intruderPos.x * intruderVel.y - intruderPos.y * intruderVel.x;
  const h = Math.sqrt(hx * hx + hy * hy + hz * hz);

  // Eccentricity: e = sqrt(1 + 2 * epsilon * h^2 / mu^2)
  const eSq = 1 + (2 * initialEnergy * (h * h)) / (mu * mu);
  const e = Math.sqrt(Math.max(1, eSq));

  // Periapsis distance: q = (h^2 / mu) / (1 + e)
  const periapsisKm = (h * h) / (mu * (1 + e));

  // Delta-V required to close the orbit (bring epsilon to 0 at periapsis)
  // v_esc_peri = sqrt(2 * mu / q)
  // v_peri = sqrt(2 * (initialEnergy + mu / q))
  const vEscPeri = Math.sqrt((2 * mu) / Math.max(1, periapsisKm));
  const vPeri = Math.sqrt(Math.max(0, 2 * (initialEnergy + mu / Math.max(1, periapsisKm))));
  const deltaVRequired = Math.max(0, vPeri - vEscPeri);

  let isCaptured = false;
  let postEnergy = initialEnergy;
  let mechanism: CaptureEvaluation['mechanism'] = 'insufficient_energy_loss';

  // 1. Tidal capture check if periapsis penetrates within 2.5 stellar radii
  if (periapsisKm < primaryRadiusKm * 2.5 && periapsisKm > primaryRadiusKm) {
    const tidalLoss = 0.1 * initialEnergy;
    postEnergy -= tidalLoss;
    if (postEnergy < 0) {
      isCaptured = true;
      mechanism = 'tidal_dissipation';
    }
  }

  // 2. Three-body encounter energy transfer
  if (!isCaptured && secondaryPlanetMassKg > 0 && secondaryPlanetPos) {
    const dx = intruderPos.x - secondaryPlanetPos.x;
    const dy = intruderPos.y - secondaryPlanetPos.y;
    const dz = intruderPos.z - secondaryPlanetPos.z;
    const distToPlanet = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distToPlanet < 2_000_000) {
      // Significant perturbation
      const threeBodyTransfer = (G_KM * secondaryPlanetMassKg) / distToPlanet;
      postEnergy -= threeBodyTransfer;
      if (postEnergy < 0) {
        isCaptured = true;
        mechanism = 'three_body_exchange';
      }
    }
  }

  return {
    isCaptured,
    initialSpecificEnergy: initialEnergy,
    postEncounterSpecificEnergy: postEnergy,
    deltaVRequiredForCaptureKmS: deltaVRequired,
    periapsisDistanceKm: periapsisKm,
    mechanism,
  };
}
