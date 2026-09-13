/**
 * Planetary Synodic Periods & Alignment Forecaster.
 * 1 / S = | 1 / P1 - 1 / P2 |
 * Calculates time between successive oppositions/conjunctions for planet pairs.
 */

export interface SynodicForecast {
  body1Id: string;
  body2Id: string;
  period1Days: number;
  period2Days: number;
  synodicPeriodDays: number;
  nextOppositionDays: number;
  patternRepetitionYears: number;
}

export class SynodicPeriodCalculator {
  public static calculateSynodic(
    b1Id: string,
    b2Id: string,
    p1Days: number,
    p2Days: number,
    currentMeanAnomaly1Rad = 0,
    currentMeanAnomaly2Rad = 0
  ): SynodicForecast {
    if (p1Days <= 0 || p2Days <= 0 || p1Days === p2Days) {
      return {
        body1Id: b1Id,
        body2Id: b2Id,
        period1Days: p1Days,
        period2Days: p2Days,
        synodicPeriodDays: Infinity,
        nextOppositionDays: Infinity,
        patternRepetitionYears: Infinity,
      };
    }

    // Synodic period S
    const invS = Math.abs(1 / p1Days - 1 / p2Days);
    const sDays = invS > 0 ? 1 / invS : Infinity;

    // Relative angular velocity delta_omega = 2pi / S
    const deltaOmega = Math.abs((2 * Math.PI / p1Days) - (2 * Math.PI / p2Days));
    const currentPhaseDiff = ((currentMeanAnomaly1Rad - currentMeanAnomaly2Rad) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    // Opposition occurs at phase difference = pi
    const phaseToOpposition = (Math.PI - currentPhaseDiff + 2 * Math.PI) % (2 * Math.PI);
    const nextOppositionDays = deltaOmega > 0 ? phaseToOpposition / deltaOmega : sDays;

    return {
      body1Id: b1Id,
      body2Id: b2Id,
      period1Days: p1Days,
      period2Days: p2Days,
      synodicPeriodDays: sDays,
      nextOppositionDays,
      patternRepetitionYears: sDays / 365.25,
    };
  }
}
