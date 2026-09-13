/**
 * Dyson Ring Megastructure Mesh.
 * Renders a high-specular metallic torus collector ring surrounding the central star.
 */

import { Mesh, TorusGeometry, MeshStandardMaterial, DoubleSide } from 'three';

export class DysonRingMesh {
  public mesh: Mesh;
  private material: MeshStandardMaterial;

  constructor(ringRadius = 15.0, tubeRadius = 0.12, color = 0x38bdf8) {
    const geom = new TorusGeometry(ringRadius, tubeRadius, 16, 128);
    geom.rotateX(Math.PI / 2);

    this.material = new MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      side: DoubleSide,
    });

    this.mesh = new Mesh(geom, this.material);
  }

  public setInclination(angleRad: number): void {
    this.mesh.rotation.x = angleRad;
  }
}
