/**
 * Tisserand Invariant Phase-Space Contour Visualizer.
 * Renders an orbital boundary curve representing T = const in (a, e) space.
 */

import { Line, BufferGeometry, LineBasicMaterial, Vector3 } from 'three';

export class TisserandContourMesh {
  public line: Line;

  constructor(perturberA: number, tisserandTarget = 3.0, pointsCount = 64) {
    const pts: Vector3[] = [];

    // Parametrize a from 0.5 * perturberA to 2.5 * perturberA
    const minA = perturberA * 0.4;
    const maxA = perturberA * 2.2;

    for (let i = 0; i <= pointsCount; i++) {
      const a = minA + (i / pointsCount) * (maxA - minA);
      // T = ap / a + 2 * sqrt((a / ap) * (1 - e^2))
      // sqrt((a/ap) * (1 - e^2)) = (T - ap/a) / 2
      const diff = (tisserandTarget - perturberA / a) / 2;
      if (diff >= 0) {
        const factor = (diff * diff) * (perturberA / a);
        if (factor <= 1.0) {
          const e = Math.sqrt(1.0 - factor);
          pts.push(new Vector3(a, e * 10.0, 0)); // Scaled e for visibility
        }
      }
    }

    const geom = new BufferGeometry().setFromPoints(pts);
    const mat = new LineBasicMaterial({ color: 0xe879f9, transparent: true, opacity: 0.7 });
    this.line = new Line(geom, mat);
  }
}
