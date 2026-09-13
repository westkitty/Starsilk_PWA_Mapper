/**
 * Relativistic Astrophysical Jet Mesh.
 * Collimated plasma cylinder/cone emitting along rotational magnetic poles.
 */

import { Mesh, CylinderGeometry, MeshBasicMaterial, DoubleSide, Group, Vector3 } from 'three';

export class RelativisticJetMesh {
  public group: Group;
  private material: MeshBasicMaterial;

  constructor(length = 20.0, baseRadius = 0.2, tipRadius = 1.2, color = 0x818cf8) {
    this.group = new Group();

    const geom = new CylinderGeometry(tipRadius, baseRadius, length, 32, 1, true);
    geom.translate(0, length / 2, 0);

    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      side: DoubleSide,
      depthWrite: false,
    });

    // North jet
    const northJet = new Mesh(geom, this.material);
    this.group.add(northJet);

    // South jet
    const southGeom = geom.clone();
    southGeom.rotateX(Math.PI);
    const southJet = new Mesh(southGeom, this.material);
    this.group.add(southJet);
  }

  public updatePole(center: Vector3, poleAxis: Vector3): void {
    this.group.position.copy(center);
    this.group.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), poleAxis.clone().normalize());
  }
}
