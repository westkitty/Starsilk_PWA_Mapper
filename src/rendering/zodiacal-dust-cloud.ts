/**
 * Zodiacal Dust Cloud & Ecliptic Scattered Light Disc.
 * Renders the faint interplanetary dust cloud in the ecliptic plane.
 */

import { Mesh, RingGeometry, MeshBasicMaterial, DoubleSide } from 'three';

export class ZodiacalDustCloud {
  public mesh: Mesh;
  private material: MeshBasicMaterial;

  constructor(innerRadius = 0.8, outerRadius = 12.0, color = 0xfef08a) {
    const geom = new RingGeometry(innerRadius, outerRadius, 64);
    geom.rotateX(Math.PI / 2);

    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      side: DoubleSide,
      depthWrite: false,
    });

    this.mesh = new Mesh(geom, this.material);
  }

  public setVisibility(visible: boolean): void {
    this.mesh.visible = visible;
  }
}
