/**
 * Tisserand's Parameter Calculator.
 * T_P = a_p / a + 2 * sqrt((a / a_p) * (1 - e^2)) * cos(i)
 * Classifies small bodies (Asteroid: T_P > 3, Jupiter Family Comet: 2 < T_P < 3, Halley-type: T_P < 2).
 */

export type SmallBodyClass = 'asteroid' | 'jupiter_family_comet' | 'halley_type_comet' | 'oort_comet';

export interface TisserandClassification {
  tisserandValue: number;
  classification: SmallBodyClass;
  isEncounterPossible: boolean;
}

export class TisserandCalculator {
  public static computeTisserand(
    smallBodySemiMajorAxis: number,
    smallBodyEccentricity: number,
    smallBodyInclinationRad: number,
    perturberSemiMajorAxis: number
  ): TisserandClassification {
    const a = smallBodySemiMajorAxis;
    const e = smallBodyEccentricity;
    const inc = smallBodyInclinationRad;
    const ap = perturberSemiMajorAxis;

    if (a <= 0 || ap <= 0) {
      return {
        tisserandValue: 0,
        classification: 'asteroid',
        isEncounterPossible: false,
      };
    }

    const term1 = ap / a;
    const term2 = 2 * Math.sqrt((a / ap) * Math.max(0, 1 - e * e)) * Math.cos(inc);
    const tp = term1 + term2;

    let classification: SmallBodyClass = 'asteroid';
    if (tp > 3.0) {
      classification = 'asteroid';
    } else if (tp >= 2.0 && tp <= 3.0) {
      classification = 'jupiter_family_comet';
    } else if (tp > 0 && tp < 2.0) {
      classification = 'halley_type_comet';
    } else {
      classification = 'oort_comet';
    }

    // Encounter possible if periapsis <= ap and apoapsis >= ap
    const periapsis = a * (1 - e);
    const apoapsis = a * (1 + e);
    const isEncounterPossible = periapsis <= ap * 1.1 && apoapsis >= ap * 0.9;

    return {
      tisserandValue: tp,
      classification,
      isEncounterPossible,
    };
  }
}
