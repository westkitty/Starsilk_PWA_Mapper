/**
 * Dyson Swarm & Megastructure Energy Harvester Simulation.
 * Models swarm orbital coverage, total power harvested (Watts), star dimming factor, and infrared waste heat radiation.
 */

export interface DysonSwarmStats {
  collectorCount: number;
  swarmRadiusAu: number;
  powerHarvestedWatts: number;
  stellarFractionObscured: number; // 0 to 1
  infraredWasteTempK: number; // Re-radiation blackbody temp
  kardashevLevel: number; // e.g. 1.0 to 2.0
}

export class DysonSwarmEngine {
  /**
   * Evaluates Dyson swarm harvesting performance.
   * starLuminosityWatts: Sun ~ 3.828e26 W
   * collectorAreaM2: area per collector unit
   */
  public static calculateSwarm(
    starLuminosityWatts: number,
    collectorCount: number,
    collectorAreaKm2 = 1000,
    swarmRadiusAu = 0.5
  ): DysonSwarmStats {
    const AU_METERS = 1.496e11;
    const radiusMeters = swarmRadiusAu * AU_METERS;
    const totalSwarmSphereArea = 4 * Math.PI * radiusMeters * radiusMeters;

    const totalCollectorAreaM2 = collectorCount * collectorAreaKm2 * 1e6;
    const obscuredFraction = Math.min(0.99, totalCollectorAreaM2 / totalSwarmSphereArea);

    const solarFlux = starLuminosityWatts / (4 * Math.PI * radiusMeters * radiusMeters);
    const powerHarvested = solarFlux * totalCollectorAreaM2 * 0.4; // 40% photovoltaic efficiency

    // Waste heat re-radiation temp: P_waste = A * sigma * T^4
    const SIGMA = 5.670374e-8;
    const wastePower = powerHarvested * 0.6;
    const wasteTempK = totalCollectorAreaM2 > 0
      ? Math.pow(wastePower / (totalCollectorAreaM2 * SIGMA), 0.25)
      : 300;

    // Kardashev scale: K = (log10(P) - 6) / 10
    const kardashev = powerHarvested > 1e6 ? (Math.log10(powerHarvested) - 6) / 10 : 1.0;

    return {
      collectorCount,
      swarmRadiusAu,
      powerHarvestedWatts: powerHarvested,
      stellarFractionObscured: obscuredFraction,
      infraredWasteTempK: wasteTempK,
      kardashevLevel: Math.max(1.0, Math.min(2.5, kardashev)),
    };
  }
}
