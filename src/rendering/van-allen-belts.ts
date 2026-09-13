/**
 * Van Allen Trapped Radiation Belts (Inner Proton & Outer Electron Belts).
 * Renders nested toroidal particle meshes surrounding magnetized planets.
 */

import { Points, TorusGeometry, PointsMaterial, Group } from 'three';

export class VanAllenBeltsVisualizer {
  public group: Group;

  constructor(planetRadius = 1.0) {
    this.group = new Group();

    // Inner belt (proton dominant, ~1.5 - 2 R_p)
    const innerGeom = new TorusGeometry(planetRadius * 1.8, planetRadius * 0.4, 16, 64);
    const innerMat = new PointsMaterial({ color: 0xef4444, size: 0.15, transparent: true, opacity: 0.5 });
    const innerBelt = new Points(innerGeom, innerMat);
    this.group.add(innerBelt);

    // Outer belt (electron dominant, ~3.0 - 5.0 R_p)
    const outerGeom = new TorusGeometry(planetRadius * 4.0, planetRadius * 1.0, 16, 96);
    const outerMat = new PointsMaterial({ color: 0x3b82f6, size: 0.2, transparent: true, opacity: 0.35 });
    const outerBelt = new Points(outerGeom, outerMat);
    this.group.add(outerBelt);

    // Align equatorial plane
    this.group.rotateX(Math.PI / 2);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
}
