/**
 * Kirkwood Gap Resonant Depletion Engine.
 * Identifies resonant semi-major axes cleared by mean-motion resonances with an outer giant planet.
 */

export interface KirkwoodGap {
  ratioName: string; // e.g. "3:1", "5:2", "2:1"
  p: number; // orbital period ratio numerator
  q: number; // orbital period ratio denominator
  semiMajorAxisKm: number;
  gapWidthKm: number;
  description: string;
}

/**
 * Calculates Kirkwood gap locations in semi-major axis (km) for a given perturber planet.
 * Kepler's 3rd Law: a_gap = a_perturber * (p / q)^(2/3)
 */
export function calculateKirkwoodGaps(perturberSemiMajorAxisKm: number): KirkwoodGap[] {
  const ratios = [
    { name: '4:1', p: 1, q: 4, widthFactor: 0.015, desc: 'Inner Hestia family boundary' },
    { name: '3:1', p: 1, q: 3, widthFactor: 0.025, desc: 'Major chaotic zone; Alinda asteroids source' },
    { name: '5:2', p: 2, q: 5, widthFactor: 0.018, desc: 'Chaotic eccentricity pumping gap' },
    { name: '7:3', p: 3, q: 7, widthFactor: 0.012, desc: 'Koronis/Eos family boundary' },
    { name: '2:1', p: 1, q: 2, widthFactor: 0.030, desc: 'Hecuba gap; outer main belt edge' },
    { name: '3:2', p: 2, q: 3, widthFactor: 0.020, desc: 'Hilda group resonant stabilization' },
  ];

  return ratios.map(r => {
    const aGap = perturberSemiMajorAxisKm * Math.pow(r.p / r.q, 2 / 3);
    return {
      ratioName: r.name,
      p: r.p,
      q: r.q,
      semiMajorAxisKm: aGap,
      gapWidthKm: aGap * r.widthFactor,
      description: r.desc,
    };
  });
}

/**
 * Tests if an asteroid at semiMajorAxisKm falls inside any Kirkwood gap clearance envelope.
 */
export function isInsideKirkwoodGap(semiMajorAxisKm: number, gaps: KirkwoodGap[]): KirkwoodGap | null {
  for (const gap of gaps) {
    if (Math.abs(semiMajorAxisKm - gap.semiMajorAxisKm) <= gap.gapWidthKm / 2) {
      return gap;
    }
  }
  return null;
}
