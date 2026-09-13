/**
 * Planetary Magnetosphere & Chapman-Ferraro Stand-off Distance.
 * Models intrinsic dipole moment, solar wind dynamic pressure balance, and magnetopause radius.
 */

export interface MagnetosphereProfile {
  dipoleMomentAm2: number; // Magnetic dipole moment (A m^2)
  standoffRadiusKm: number; // Subsolar magnetopause distance R_mp (km)
  standoffInPlanetaryRadii: number; // R_mp / R_p
  hasProtectiveShield: boolean; // Protects atmosphere from sputtering if R_mp > 2 R_p
}

export class MagnetosphereSolver {
  /**
   * R_mp = (mu_0 * M^2 / (8 * pi^2 * rho * v_sw^2))^(1/6)
   */
  public static calculateMagnetopause(
    dipoleMomentAm2: number,
    planetRadiusKm: number,
    solarWindVelocityKmS = 400,
    solarWindDensityProtonsCm3 = 5
  ): MagnetosphereProfile {
    if (dipoleMomentAm2 <= 0 || planetRadiusKm <= 0) {
      return {
        dipoleMomentAm2: 0,
        standoffRadiusKm: planetRadiusKm,
        standoffInPlanetaryRadii: 1.0,
        hasProtectiveShield: false,
      };
    }

    // Solar wind dynamic pressure: P_sw = rho * v^2
    const protonMassKg = 1.673e-27;
    const rhoKgM3 = solarWindDensityProtonsCm3 * 1e6 * protonMassKg;
    const vMPerS = solarWindVelocityKmS * 1e3;
    const dynamicPressure = rhoKgM3 * vMPerS * vMPerS; // Pascals ~ 1-3 nPa

    const mu0 = 4 * Math.PI * 1e-7;
    // B_eq = (mu_0 / 4pi) * (M / R^3)
    // Stand-off radius where B^2 / (2 * mu0) = 2 * P_sw
    const term = (mu0 * Math.pow(dipoleMomentAm2, 2)) / (32 * Math.PI * Math.PI * Math.max(1e-12, dynamicPressure));
    const standoffMeters = Math.pow(term, 1 / 6);
    const standoffKm = standoffMeters / 1000;
    const standoffRadii = standoffKm / planetRadiusKm;

    return {
      dipoleMomentAm2,
      standoffRadiusKm: standoffKm,
      standoffInPlanetaryRadii: standoffRadii,
      hasProtectiveShield: standoffRadii >= 2.0,
    };
  }
}
