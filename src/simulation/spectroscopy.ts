/**
 * Planetary Atmospheric Spectroscopy & Biosignature Heuristic Proxy Model.
 * Computes estimated constituent abundances (H2O, CO2, CH4, O2, N2) and disequilibrium
 * biosignature index using planetary temperature, pressure, and water coverage proxies.
 */

export interface AtmosphericSpectrum {
  h2o: number; // 0 to 1 abundance
  co2: number;
  ch4: number;
  o2: number;
  n2: number;
  o3: number; // Ozone
  biosignatureIndex: number; // 0 (inert) to 1 (active disequilibrium)
  dominantAbsorptionWavelengthNm: number;
}

export class SpectroscopySolver {
  public static analyzeAtmosphere(
    surfaceTempK: number,
    surfacePressureAtm: number,
    waterCoverageFraction: number,
    volcanicActivity: number
  ): AtmosphericSpectrum {
    if (surfacePressureAtm <= 0.001) {
      return {
        h2o: 0,
        co2: 0,
        ch4: 0,
        o2: 0,
        n2: 0,
        o3: 0,
        biosignatureIndex: 0,
        dominantAbsorptionWavelengthNm: 0,
      };
    }

    // Vapor pressure fraction of H2O
    let h2o = 0;
    if (surfaceTempK >= 273 && surfaceTempK <= 373) {
      h2o = 0.01 + 0.04 * waterCoverageFraction * ((surfaceTempK - 273) / 100);
    } else if (surfaceTempK > 373) {
      h2o = Math.min(0.8, 0.1 * waterCoverageFraction + 0.005 * (surfaceTempK - 373));
    }

    // CO2 and N2 baselines
    let co2 = 0.0004 + 0.05 * volcanicActivity;
    if (waterCoverageFraction < 0.1) co2 += 0.8; // Dry greenhouse buildup
    let n2 = Math.max(0, 1.0 - (h2o + co2));

    // Biosignature disequilibrium (O2 + CH4 co-existence)
    let o2 = 0;
    let ch4 = 0.000002 + 0.01 * volcanicActivity;
    let o3 = 0;

    if (surfaceTempK >= 260 && surfaceTempK <= 320 && waterCoverageFraction > 0.3) {
      o2 = 0.21; // Biological photosynthesis proxy
      ch4 = 0.00002;
      o3 = 0.00001;
      n2 = Math.max(0, 1.0 - (o2 + h2o + co2 + ch4));
    }

    // Biosignature metric: high O2 + detectable CH4 indicates thermodynamic disequilibrium
    const biosignatureIndex = (o2 > 0.05 && ch4 > 0.000005) ? Math.min(1.0, o2 * 4.0 + ch4 * 1000) : 0;

    const dominantWavelength = h2o > 0.1 ? 1400 : (co2 > 0.2 ? 4300 : 760);

    return {
      h2o,
      co2,
      ch4,
      o2,
      n2,
      o3,
      biosignatureIndex,
      dominantAbsorptionWavelengthNm: dominantWavelength,
    };
  }
}
