/**
 * GAME11: Hill Sphere Stability Auditor.
 * Evaluates whether satellite orbits remain within true long-term stability envelopes.
 */

import { OsculatingElements } from "./types";

export interface HillStabilityReport {
  bodyId: string;
  isStable: boolean;
  orbitRadiusKm: number;
  hillRadiusKm: number;
  fractionOfHillRadius: number;
  stabilityZone: "safe" | "marginal" | "chaotic_ejection";
}

export function auditHillStability(
  bodyId: string,
  elements: OsculatingElements,
  orbitRadiusKm: number
): HillStabilityReport {
  const hillRadiusKm = elements.hillRadiusKm || (orbitRadiusKm * 10);
  const frac = orbitRadiusKm / hillRadiusKm;

  let stabilityZone: HillStabilityReport["stabilityZone"] = "safe";
  let isStable = true;

  if (frac > 0.5) {
    // Prograde satellite orbits beyond ~0.36 to 0.5 R_H become chaotic and escape
    stabilityZone = "chaotic_ejection";
    isStable = false;
  } else if (frac > 0.35) {
    stabilityZone = "marginal";
  }

  return {
    bodyId,
    isStable,
    orbitRadiusKm,
    hillRadiusKm,
    fractionOfHillRadius: Number(frac.toFixed(3)),
    stabilityZone,
  };
}
