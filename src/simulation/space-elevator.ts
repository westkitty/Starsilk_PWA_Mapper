/**
 * Space Elevator & Tether Tensile Stress Calculator.
 * Calculates synchronous orbital altitude (GEO/AEO), counterweight tether length, and max cable stress.
 */

export interface SpaceElevatorProfile {
  syncOrbitRadius: number; // Synchronous altitude R_sync = (GM / omega^2)^(1/3)
  counterweightRadius: number; // Anchor radius ensuring positive tension
  maxTensionGpa: number; // Max stress in GPa (Carbon Nanotubes ~ 50-100 GPa)
  feasibleWithKnownMaterials: boolean;
}

export class SpaceElevatorCalculator {
  /**
   * Computes elevator parameters for a rotating planet.
   * mu: GM of the planet
   * planetRadius: physical radius R
   * rotationPeriodSeconds: rotational period T
   * cableDensityKgM3: material density (e.g. 1300 kg/m^3 for CNT)
   */
  public static calculateProfile(
    mu: number,
    planetRadius: number,
    rotationPeriodSeconds: number,
    cableDensityKgM3 = 1300
  ): SpaceElevatorProfile {
    if (rotationPeriodSeconds <= 0 || mu <= 0 || planetRadius <= 0) {
      return {
        syncOrbitRadius: 0,
        counterweightRadius: 0,
        maxTensionGpa: 0,
        feasibleWithKnownMaterials: false,
      };
    }

    const omega = (2 * Math.PI) / rotationPeriodSeconds;
    const rSync = Math.cbrt(mu / (omega * omega));

    // Typical counterweight is placed at ~1.5 to 2.5 times R_sync
    const counterweightRadius = rSync * 2.0;

    // Peak stress occurs at R_sync:
    // sigma = rho * [ mu * (1/R - 1/R_sync) - (1/2) * omega^2 * (R_sync^2 - R^2) ]
    const termGrav = mu * (1 / planetRadius - 1 / rSync);
    const termCentrifugal = 0.5 * omega * omega * (rSync * rSync - planetRadius * planetRadius);
    const stressPascals = cableDensityKgM3 * Math.abs(termGrav - termCentrifugal);
    const stressGpa = stressPascals / 1e9;

    // Feasible if stress < 100 GPa (theoretical limit of carbon nanotubes)
    const feasible = stressGpa < 100 && rSync > planetRadius;

    return {
      syncOrbitRadius: rSync,
      counterweightRadius,
      maxTensionGpa: stressGpa,
      feasibleWithKnownMaterials: feasible,
    };
  }
}
