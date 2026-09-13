/**
 * Planetary Magnetopause Bow Shock Mesh.
 * Renders a semi-transparent parabolic/conical shell mesh facing upstream toward the host star.
 */

import { Mesh, MeshBasicMaterial, DoubleSide, Vector3, Group, CylinderGeometry } from 'three';

export class BowShockVisualizer {
  public group: Group;
  private material: MeshBasicMaterial;

  constructor(standoffRadius = 2.0, color = 0x4fc3f7) {
    this.group = new Group();

    // Parabolic shell approximated via open cylinder/cone geometry
    const geom = new CylinderGeometry(standoffRadius * 2.5, 0.1, standoffRadius * 3, 32, 1, true);
    geom.rotateX(Math.PI / 2);

    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      side: DoubleSide,
      wireframe: false,
      depthWrite: false,
    });

    const mesh = new Mesh(geom, this.material);
    mesh.position.z = standoffRadius * 0.8;
    this.group.add(mesh);
  }

  public updateOrientation(planetPos: Vector3, starPos: Vector3): void {
    this.group.position.copy(planetPos);
    // Face towards the star (subsolar point)
    this.group.lookAt(starPos);
  }

  public setOpacity(op: number): void {
    this.material.opacity = Math.max(0, Math.min(1, op));
  }
}
