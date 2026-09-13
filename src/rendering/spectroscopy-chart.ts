/**
 * Procedural Optical Emission/Absorption Spectroscopy Canvas Generator.
 * Creates a rainbow spectral continuum with dark Fraunhofer absorption notches.
 */

export class SpectroscopyChartGenerator {
  public static generateSpectrumCanvas(
    width = 512,
    height = 64,
    absorptionNotches: number[] = [430, 486, 527, 589, 656, 687] // Fraunhofer G, F, E, D, C, B
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Continuous visible spectrum gradient (380nm - 750nm)
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0.0, '#4b0082'); // Violet ~ 380 nm
    grad.addColorStop(0.15, '#0000ff'); // Blue ~ 450 nm
    grad.addColorStop(0.35, '#00ff00'); // Green ~ 520 nm
    grad.addColorStop(0.65, '#ffff00'); // Yellow ~ 580 nm
    grad.addColorStop(0.85, '#ff7f00'); // Orange ~ 620 nm
    grad.addColorStop(1.0, '#ff0000'); // Red ~ 750 nm

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Render dark absorption lines
    ctx.fillStyle = '#050505';
    for (const wl of absorptionNotches) {
      const frac = (wl - 380) / (750 - 380);
      if (frac >= 0 && frac <= 1) {
        const x = Math.round(frac * width);
        ctx.fillRect(x - 1, 0, 2, height);
      }
    }

    return canvas;
  }
}
