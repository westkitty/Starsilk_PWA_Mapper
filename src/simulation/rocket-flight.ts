/**
 * Multi-Stage Delta-V & Rocket Flight Simulator.
 * Implements the Tsiolkovsky Rocket Equation for staging, payload fractions,
 * and thrust maneuvers.
 */

export interface RocketStage {
  name: string;
  dryMassKg: number;
  propellantMassKg: number;
  ispSeconds: number; // Specific impulse in seconds
  thrustKn: number;
}

export interface RocketProfileResult {
  totalDeltaVKmS: number;
  stageResults: Array<{
    stageName: string;
    deltaVKmS: number;
    burnDurationSeconds: number;
    massRatio: number;
  }>;
  payloadMassKg: number;
}

const G0_M_S2 = 9.80665; // Standard gravity in m/s^2

export function calculateRocketPerformance(stages: RocketStage[], payloadMassKg: number): RocketProfileResult {
  let currentTotalMass = payloadMassKg;
  for (const s of stages) {
    currentTotalMass += s.dryMassKg + s.propellantMassKg;
  }

  let totalDeltaVMs = 0;
  const stageResults = [];

  for (const s of stages) {
    const initialMass = currentTotalMass;
    const finalMass = currentTotalMass - s.propellantMassKg;
    const massRatio = initialMass / Math.max(1, finalMass);

    // Delta-v = Isp * g0 * ln(m0 / mf)
    const stageDeltaVMs = s.ispSeconds * G0_M_S2 * Math.log(massRatio);
    totalDeltaVMs += stageDeltaVMs;

    // Burn time = m_prop / (Thrust / (Isp * g0))
    const massFlowRateKgS = s.thrustKn > 0 ? (s.thrustKn * 1000) / (s.ispSeconds * G0_M_S2) : 1;
    const burnDuration = s.propellantMassKg / Math.max(0.01, massFlowRateKgS);

    stageResults.push({
      stageName: s.name,
      deltaVKmS: stageDeltaVMs / 1000,
      burnDurationSeconds: burnDuration,
      massRatio,
    });

    // Discard burned stage
    currentTotalMass = finalMass - s.dryMassKg;
  }

  return {
    totalDeltaVKmS: totalDeltaVMs / 1000,
    stageResults,
    payloadMassKg,
  };
}
