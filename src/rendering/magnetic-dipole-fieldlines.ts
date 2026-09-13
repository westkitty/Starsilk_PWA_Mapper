/**
 * 3D Dipole Magnetic Field Line Loop Splines.
 * r(theta) = L * sin^2(theta)
 * Renders dipole magnetic loops emerging from magnetic poles.
 */

import { Line, BufferGeometry, LineBasicMaterial, Group, Vector3 } from 'three';

export class DipoleFieldLinesVisualizer {
  public group: Group;

  constructor(planetRadius = 1.0, shellCount = 4, loopsPerShell = 6) {
    this.group = new Group();
    const mat = new LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.4 });

    for (let s = 1; s <= shellCount; s++) {
      const L = planetRadius * (1.5 + s * 1.0); // L-shell parameter

      for (let l = 0; l < loopsPerShell; l++) {
        const phi = (l / loopsPerShell) * Math.PI * 2;
        const pts: Vector3[] = [];

        for (let step = -30; step <= 30; step++) {
          const theta = (step / 30) * (Math.PI / 2 - 0.15); // avoid singularities at poles
          const r = L * Math.cos(theta) * Math.cos(theta);
          const x = r * Math.cos(theta) * Math.cos(phi);
          const y = r * Math.sin(theta);
          const z = r * Math.cos(theta) * Math.sin(phi);
          pts.push(new Vector3(x, y, z));
        }

        const geom = new BufferGeometry().setFromPoints(pts);
        this.group.add(new Line(geom, mat));
      }
    }
  }

  public setOrientation(quaternion: any): void {
    this.group.quaternion.copy(quaternion);
  }
}
