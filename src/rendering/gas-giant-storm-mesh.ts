/**
 * Gas Giant Anticyclonic Storm Vortex (Great Red Spot analogue).
 * Elliptical surface patch with rotating counter-clockwise spiral texture coordinates.
 */

import { Mesh, CircleGeometry, MeshBasicMaterial, DoubleSide } from 'three';

export class GasGiantStormMesh {
  public mesh: Mesh;
  private material: MeshBasicMaterial;

  constructor(radius = 0.35, color = 0xd97706) {
    const geom = new CircleGeometry(radius, 32);
    // Scale along x for elliptical oval shape (2:1 aspect ratio)
    geom.scale(1.8, 1.0, 1.0);

    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
    });

    this.mesh = new Mesh(geom, this.material);
  }

  public updateRotation(dt: number, speed = 0.5): void {
    this.mesh.rotation.z += speed * dt;
  }
}
