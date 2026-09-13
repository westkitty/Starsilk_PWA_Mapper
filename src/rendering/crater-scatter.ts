/**
 * Procedural Impact Crater Texture & Relief Generator.
 * Paints parabolic rimmed craters with central uplift peaks onto canvas textures.
 */

export class CraterScatterGenerator {
  public static stampCraters(ctx: CanvasRenderingContext2D, width: number, height: number, count = 25): void {
    for (let i = 0; i < count; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const radius = 4 + Math.random() * 24;

      // Dark shadow depression
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0.0, 'rgba(10, 10, 15, 0.7)');
      grad.addColorStop(0.7, 'rgba(25, 25, 30, 0.5)');
      grad.addColorStop(0.9, 'rgba(180, 180, 190, 0.6)'); // bright ejecta rim
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Central peak for large craters
      if (radius > 15) {
        ctx.fillStyle = 'rgba(190, 190, 200, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
