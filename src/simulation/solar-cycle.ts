/**
 * Stellar Magnetic Activity Cycle & Solar Flare/CME Model.
 * Simulates the 11-year Schwabe / 22-year Hale magnetic dynamo oscillation.
 */

export interface SolarCycleState {
  cyclePhase: number; // 0 to 1 through the 11-year cycle
  sunspotNumber: number; // 0 to ~250
  flareProbabilityPerDay: number; // 0 to 1
  cmeProbabilityPerDay: number; // 0 to 1
  magneticPolarity: 1 | -1; // Flips every 11 years (22-year full Hale cycle)
}

export class SolarCycleEngine {
  public static evaluateCycle(epochYears: number, periodYears = 11.0): SolarCycleState {
    const haleCycle = periodYears * 2;
    const halePhase = (epochYears % haleCycle + haleCycle) % haleCycle;
    const cyclePhase = (epochYears % periodYears + periodYears) % periodYears / periodYears;

    const magneticPolarity = halePhase < periodYears ? 1 : -1;

    // Asymmetric solar cycle shape: fast rise (4 yrs), slow decay (7 yrs)
    const normalizedTime = cyclePhase * 2 * Math.PI;
    const baseWave = 0.5 * (1 - Math.cos(normalizedTime));
    const skew = 0.2 * Math.sin(normalizedTime * 2);
    const activity = Math.max(0, Math.min(1, baseWave + skew));

    const sunspotNumber = Math.round(activity * 220 + Math.random() * 15);
    const flareProbability = Math.min(0.95, 0.05 + activity * 0.85);
    const cmeProbability = Math.min(0.8, 0.02 + activity * 0.7);

    return {
      cyclePhase,
      sunspotNumber,
      flareProbabilityPerDay: flareProbability,
      cmeProbabilityPerDay: cmeProbability,
      magneticPolarity,
    };
  }
}
