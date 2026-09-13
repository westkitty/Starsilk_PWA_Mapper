/**
 * Oort Cloud Spheroidal Cometary Reservoir Particle Shell.
 * Renders an isotropic 3D spherical shell of distant icy comets at the outskirts of the star system.
 */

import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial } from 'three';

export class OortCloudVisualizer {
  public points: Points;

  constructor(innerRadiusAu = 80.0, outerRadiusAu = 150.0, count = 2500) {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const r = innerRadiusAu + u * (outerRadiusAu - innerRadiusAu);
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      color: 0x94a3b8,
      size: 0.25,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    this.points = new Points(geom, mat);
  }

  public setVisible(visible: boolean): void {
    this.points.visible = visible;
  }
}
