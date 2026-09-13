/**
 * Dynamic Scale Governor.
 * Coordinates view distances, rendering scale factors, and floating-point stability
 * across lunar, planetary, and interstellar systems.
 */

export type ScaleRegime = 'planetary_moon' | 'inner_system' | 'solar_system' | 'interstellar';

export interface ScaleContext {
  regime: ScaleRegime;
  maxSpanKm: number;
  renderScaleFactor: number;
  distanceUnitLabel: string;
}

export function evaluateScaleRegime(maxSpanKm: number): ScaleContext {
  if (maxSpanKm < 5_000_000) {
    // Under 5 million km: Lunar / Jovian satellite system
    return {
      regime: 'planetary_moon',
      maxSpanKm,
      renderScaleFactor: 1.0,
      distanceUnitLabel: 'km',
    };
  } else if (maxSpanKm < 500_000_000) {
    // Under ~3.3 AU: Inner terrestrial system
    return {
      regime: 'inner_system',
      maxSpanKm,
      renderScaleFactor: 1e-3,
      distanceUnitLabel: '1,000 km',
    };
  } else if (maxSpanKm < 15_000_000_000) {
    // Under ~100 AU: Full solar / Kuiper belt system
    return {
      regime: 'solar_system',
      maxSpanKm,
      renderScaleFactor: 1e-6,
      distanceUnitLabel: 'Mkm / AU',
    };
  } else {
    // Deep interstellar / Oort cloud
    return {
      regime: 'interstellar',
      maxSpanKm,
      renderScaleFactor: 1e-9,
      distanceUnitLabel: 'AU / ly',
    };
  }
}
