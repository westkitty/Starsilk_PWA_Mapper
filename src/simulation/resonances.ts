/**
 * GAME01: Orbital Resonance Detector.
 * Identifies mean-motion orbital period ratios (1:2, 2:3, 3:4, 1:3, 2:5) between orbiting bodies.
 */

import { CelestialBody, OsculatingElements } from "./types";
import { calculateOsculatingElements, findDominantPrimary } from "./orbital-mechanics";

export interface ResonanceMatch {
  bodyIdA: string;
  bodyIdB: string;
  body1Name?: string;
  body2Name?: string;
  periodA: number;
  periodB: number;
  ratioA: number;
  ratioB: number;
  ratio: string;
  ratioLabel: string;
  divergence: number;
  deviationPct: number;
}

const COMMON_RATIOS: [number, number][] = [
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
  [2, 5],
  [3, 5],
  [1, 4],
];

export function detectResonances(
  orbitsOrBodies: ({ bodyId: string; elements: OsculatingElements; name?: string })[] | CelestialBody[],
  tolerancePct: number = 3.0
): ResonanceMatch[] {
  let orbits: { bodyId: string; elements: OsculatingElements; name?: string }[] = [];

  if (orbitsOrBodies.length > 0 && 'position' in orbitsOrBodies[0]) {
    const bodies = orbitsOrBodies as CelestialBody[];
    const primaries = bodies.filter(b => b.type === 'star' || (!b.primaryId && b.fixed));
    const primary = primaries[0] || bodies[0];

    for (const b of bodies) {
      if (b.id === primary.id) continue;
      const dom = findDominantPrimary(b, bodies) || primary;
      const elem = calculateOsculatingElements(b, dom);
      orbits.push({
        bodyId: b.id,
        name: b.name,
        elements: elem,
      });
    }
  } else {
    orbits = orbitsOrBodies as { bodyId: string; elements: OsculatingElements; name?: string }[];
  }

  const matches: ResonanceMatch[] = [];

  for (let i = 0; i < orbits.length; i++) {
    for (let j = i + 1; j < orbits.length; j++) {
      const oA = orbits[i];
      const oB = orbits[j];
      if (!oA.elements.isBound || !oB.elements.isBound) continue;
      if (oA.elements.periodSec <= 0 || oB.elements.periodSec <= 0) continue;

      const pA = Math.min(oA.elements.periodSec, oB.elements.periodSec);
      const pB = Math.max(oA.elements.periodSec, oB.elements.periodSec);
      const observedRatio = pA / pB;

      for (const [rA, rB] of COMMON_RATIOS) {
        const expectedRatio = rA / rB;
        const deviationPct = Math.abs(observedRatio - expectedRatio) / expectedRatio * 100;
        if (deviationPct <= tolerancePct) {
          matches.push({
            bodyIdA: oA.bodyId,
            bodyIdB: oB.bodyId,
            body1Name: oA.name || oA.bodyId,
            body2Name: oB.name || oB.bodyId,
            periodA: oA.elements.periodSec,
            periodB: oB.elements.periodSec,
            ratioA: rA,
            ratioB: rB,
            ratio: `${rA}:${rB}`,
            ratioLabel: `${rA}:${rB}`,
            divergence: Number((deviationPct / 100).toFixed(4)),
            deviationPct: Number(deviationPct.toFixed(2)),
          });
          break;
        }
      }
    }
  }

  return matches;
}
