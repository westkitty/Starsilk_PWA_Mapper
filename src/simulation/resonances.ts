/**
 * GAME01: Orbital Resonance Detector.
 * Identifies mean-motion orbital period ratios (1:2, 2:3, 3:4, 1:3, 2:5) between orbiting bodies.
 */

import { OsculatingElements } from "./types";

export interface ResonanceMatch {
  bodyIdA: string;
  bodyIdB: string;
  periodA: number;
  periodB: number;
  ratioA: number;
  ratioB: number;
  ratioLabel: string;
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
  orbits: { bodyId: string; elements: OsculatingElements }[],
  tolerancePct: number = 3.0
): ResonanceMatch[] {
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
            periodA: oA.elements.periodSec,
            periodB: oB.elements.periodSec,
            ratioA: rA,
            ratioB: rB,
            ratioLabel: `${rA}:${rB}`,
            deviationPct: Number(deviationPct.toFixed(2)),
          });
          break;
        }
      }
    }
  }

  return matches;
}
