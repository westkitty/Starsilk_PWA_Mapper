/**
 * Roche Lobe Overflow (RLOF) & Mass Transfer in Close Binaries.
 * Calculates effective Roche lobe radius via Eggleton's formula (1983) and mass transfer rates.
 */

export interface RocheLobeReport {
  rL1SeparationFraction: number; // r_L / a
  rL1RadiusKm: number;
  isOverflowing: boolean;
  massTransferRateSolarMassesPerYear: number;
}

export class RocheLobeOverflowSolver {
  /**
   * Eggleton's formula for the effective radius of the Roche lobe of star 1:
   * r_L / a = 0.49 * q^(2/3) / ( 0.6 * q^(2/3) + ln(1 + q^(1/3)) )
   * where q = M1 / M2
   */
  public static calculateRocheLobe(
    star1Mass: number, // M1
    star2Mass: number, // M2
    separationKm: number, // a
    star1RadiusKm: number // R1
  ): RocheLobeReport {
    if (star1Mass <= 0 || star2Mass <= 0 || separationKm <= 0) {
      return {
        rL1SeparationFraction: 0,
        rL1RadiusKm: 0,
        isOverflowing: false,
        massTransferRateSolarMassesPerYear: 0,
      };
    }

    const q = star1Mass / star2Mass;
    const q13 = Math.cbrt(q);
    const q23 = q13 * q13;

    const numerator = 0.49 * q23;
    const denominator = 0.6 * q23 + Math.log(1 + q13);
    const rL1Frac = numerator / denominator;
    const rL1Km = rL1Frac * separationKm;

    const isOverflowing = star1RadiusKm > rL1Km;
    let transferRate = 0;

    if (isOverflowing) {
      const overflowFraction = (star1RadiusKm - rL1Km) / rL1Km;
      // Exponential accretion stream rate
      transferRate = 1e-9 * Math.pow(1 + overflowFraction * 10, 3);
    }

    return {
      rL1SeparationFraction: rL1Frac,
      rL1RadiusKm: rL1Km,
      isOverflowing,
      massTransferRateSolarMassesPerYear: transferRate,
    };
  }
}
