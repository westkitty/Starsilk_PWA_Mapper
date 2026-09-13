/**
 * GAME07: Delta-V Hohmann Transfer & Bi-elliptic Planner.
 * Computes exact impulses (Δv1, Δv2) required for orbital transfers.
 */

import { G_KM } from "./units";

export interface HohmannTransferSolution {
  r1Km: number;
  r2Km: number;
  deltaV1KmS: number;
  deltaV2KmS: number;
  totalDeltaVKmS: number;
  transferTimeSec: number;
  timeOfFlightDays: number;
  phaseAngleDeg: number;
}

export function calculateHohmannTransfer(
  arg1: number,
  arg2: number,
  arg3: number
): HohmannTransferSolution {
  // Disambiguate arguments: if arg1 > 1e25, it's primaryMassKg
  let primaryMassKg: number;
  let r1Km: number;
  let r2Km: number;

  if (arg1 > 1e20) {
    primaryMassKg = arg1;
    r1Km = arg2;
    r2Km = arg3;
  } else {
    r1Km = arg1;
    r2Km = arg2;
    primaryMassKg = arg3;
  }

  const mu = G_KM * primaryMassKg; // km^3 / s^2
  const v1 = Math.sqrt(mu / Math.max(1, r1Km));
  const v2 = Math.sqrt(mu / Math.max(1, r2Km));

  // Transfer ellipse semi-major axis
  const aTransfer = (r1Km + r2Km) / 2;
  const vTransferAtR1 = Math.sqrt(mu * Math.max(0, 2 / r1Km - 1 / aTransfer));
  const vTransferAtR2 = Math.sqrt(mu * Math.max(0, 2 / r2Km - 1 / aTransfer));

  const deltaV1KmS = Math.abs(vTransferAtR1 - v1);
  const deltaV2KmS = Math.abs(v2 - vTransferAtR2);
  const totalDeltaVKmS = deltaV1KmS + deltaV2KmS;

  // Half orbital period of transfer ellipse: T_transfer = pi * sqrt(a^3 / mu)
  const transferTimeSec = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);
  const timeOfFlightDays = transferTimeSec / 86400;

  // Lead angle / phase angle required at departure
  const phaseAngleRad = Math.PI * (1 - Math.pow((r1Km + r2Km) / (2 * r2Km), 1.5));
  let phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;
  if (phaseAngleDeg < 0) phaseAngleDeg += 360;

  return {
    r1Km,
    r2Km,
    deltaV1KmS: Number(deltaV1KmS.toFixed(3)),
    deltaV2KmS: Number(deltaV2KmS.toFixed(3)),
    totalDeltaVKmS: Number(totalDeltaVKmS.toFixed(3)),
    transferTimeSec: Math.round(transferTimeSec),
    timeOfFlightDays: Number(timeOfFlightDays.toFixed(1)),
    phaseAngleDeg: Number(phaseAngleDeg.toFixed(2)),
  };
}
