/**
 * Dynamic Titius-Bode Law Extrapolator.
 * Computes geometric progression orbital slots (a_n = a_0 * k^n) and identifies
 * gaps or unpopulated resonant bands in planetary systems.
 */

import { CelestialBody } from './types';

const AU_KM = 149597870.7;

export interface BodeSlot {
  slotIndex: number;
  predictedRadiusKm: number;
  predictedRadiusAu: number;
  closestBodyName?: string;
  divergencePercent?: number;
  isPopulated: boolean;
}

export function extrapolateBodeSlots(
  bodies: CelestialBody[],
  primaryStarId: string,
  maxSlots = 10,
  tolerancePercent = 25
): BodeSlot[] {
  // Classical solar system Titius-Bode formulation:
  // a = 0.4 + 0.3 * 2^m (m = -inf, 0, 1, 2, 3...)
  // For Mercury (0.4 AU), Venus (0.7 AU), Earth (1.0 AU), Mars (1.6 AU), Belt (2.8 AU), Jupiter (5.2 AU)...
  const planets = bodies.filter(b => b.primaryId === primaryStarId || (!b.primaryId && b.id !== primaryStarId));

  const slots: BodeSlot[] = [];

  for (let n = 0; n < maxSlots; n++) {
    let aAu = 0;
    if (n === 0) {
      aAu = 0.4;
    } else {
      aAu = 0.4 + 0.3 * Math.pow(2, n - 1);
    }

    const aKm = aAu * AU_KM;

    // Find closest planet
    let closestBody: CelestialBody | null = null;
    let minDiffKm = Infinity;

    for (const p of planets) {
      const dist = Math.sqrt(p.position.x ** 2 + p.position.y ** 2 + p.position.z ** 2);
      const diff = Math.abs(dist - aKm);
      if (diff < minDiffKm) {
        minDiffKm = diff;
        closestBody = p;
      }
    }

    let isPopulated = false;
    let divergencePercent: number | undefined;

    if (closestBody) {
      const dist = Math.sqrt(closestBody.position.x ** 2 + closestBody.position.y ** 2 + closestBody.position.z ** 2);
      divergencePercent = (Math.abs(dist - aKm) / aKm) * 100;
      if (divergencePercent <= tolerancePercent) {
        isPopulated = true;
      }
    }

    slots.push({
      slotIndex: n,
      predictedRadiusKm: aKm,
      predictedRadiusAu: aAu,
      closestBodyName: closestBody?.name,
      divergencePercent,
      isPopulated,
    });
  }

  return slots;
}
