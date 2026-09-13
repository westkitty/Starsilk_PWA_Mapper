/**
 * Planetary Tidal Heating & Viscoelastic Dissipation Solver.
 * Evaluates tidal friction energy dissipation rate dE/dt (Peale, Cassen, Reynolds model, e.g. Io, Europa).
 */

export interface TidalHeatingResult {
  dissipationPowerWatts: number; // Watts
  heatFluxWPerM2: number; // W / m^2
  isVolcanicallyActive: boolean; // Io ~ 2-3 W/m^2, Earth ~ 0.08 W/m^2
  subsurfaceOceanLikely: boolean; // Europa/Enceladus analogue
}

export class TidalHeatingSolver {
  /**
   * Computes tidal heating rate:
   * dE/dt = (21/2) * (k_2 / Q) * (G * M_p^2 * R_m^5 * n * e^2) / a^6
   */
  public static calculateTidalHeating(
    primaryMass: number, // M_p (kg)
    moonRadius: number, // R_m (meters)
    semiMajorAxis: number, // a (meters)
    eccentricity: number, // e
    meanMotionRadS: number, // n (rad/s)
    k2OverQ = 0.015 // Love number / tidal dissipation factor (Io ~ 0.015)
  ): TidalHeatingResult {
    if (semiMajorAxis <= 0 || moonRadius <= 0 || eccentricity <= 0) {
      return {
        dissipationPowerWatts: 0,
        heatFluxWPerM2: 0,
        isVolcanicallyActive: false,
        subsurfaceOceanLikely: false,
      };
    }

    const G = 6.6743e-11;
    const numerator = 10.5 * k2OverQ * G * Math.pow(primaryMass, 2) * Math.pow(moonRadius, 5) * meanMotionRadS * Math.pow(eccentricity, 2);
    const denominator = Math.pow(semiMajorAxis, 6);
    const power = numerator / (denominator || 1);

    const surfaceArea = 4 * Math.PI * Math.pow(moonRadius, 2);
    const flux = surfaceArea > 0 ? power / surfaceArea : 0;

    const isVolcanicallyActive = flux >= 0.5; // High hyper-volcanism
    const subsurfaceOceanLikely = flux >= 0.05 && flux < 0.5; // Enough to keep ice melted

    return {
      dissipationPowerWatts: power,
      heatFluxWPerM2: flux,
      isVolcanicallyActive,
      subsurfaceOceanLikely,
    };
  }
}
