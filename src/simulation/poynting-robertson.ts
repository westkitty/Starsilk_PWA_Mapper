/**
 * Poynting-Robertson Drag & Radiative Orbital Decay.
 * Computes drag force causing small dust grains/micrometeoroids to spiral into the central star.
 */

export interface PoyntingRobertsonDecay {
  radialDragAcceleration: number; // m/s^2
  tangentialDragAcceleration: number; // m/s^2
  spiralInLifetimeYears: number; // Time until dust grain reaches stellar radius
}

export class PoyntingRobertsonSolver {
  /**
   * Calculates Poynting-Robertson drag for a spherical particle.
   * starLuminosityWatts: Sun ~ 3.828e26 W
   * particleRadiusMicrons: s (micrometers, e.g. 1-100 um)
   * particleDensityGPerCm3: rho (e.g. 2.5 g/cm^3 for silicate dust)
   * orbitalDistanceAu: r
   */
  public static calculateDecay(
    starLuminosityWatts: number,
    particleRadiusMicrons: number,
    particleDensityGPerCm3 = 2.5,
    orbitalDistanceAu = 1.0
  ): PoyntingRobertsonDecay {
    const s_meters = particleRadiusMicrons * 1e-6;
    const rho_kgM3 = particleDensityGPerCm3 * 1000;
    const AU_METERS = 1.496e11;
    const r_meters = orbitalDistanceAu * AU_METERS;

    const C = 2.99792458e8; // speed of light

    // Classical PR spiral-in lifetime for circular orbit:
    // t_pr = (4/3) * (c^2 * rho * s * r^2) / L
    const tPrSeconds = (4 / 3) * (C * C * rho_kgM3 * s_meters * r_meters * r_meters) / starLuminosityWatts;
    const tPrYears = tPrSeconds / (365.25 * 86400);

    const flux = starLuminosityWatts / (4 * Math.PI * r_meters * r_meters);
    const radPressureAcc = (flux * Math.PI * s_meters * s_meters) / ((4 / 3) * Math.PI * Math.pow(s_meters, 3) * rho_kgM3 * C);

    // Tangential drag is ~ (v / c) * radial radiation force
    const vOrbital = Math.sqrt((6.6743e-11 * 1.989e30) / r_meters);
    const tangentialDrag = radPressureAcc * (vOrbital / C);

    return {
      radialDragAcceleration: radPressureAcc,
      tangentialDragAcceleration: tangentialDrag,
      spiralInLifetimeYears: Math.max(1, tPrYears),
    };
  }
}
