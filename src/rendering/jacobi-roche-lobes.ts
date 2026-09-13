/**
 * Jacobi Constant & Binary Roche Lobe 3D Equipotential Wireframe.
 * Visualizes the teardrop-shaped inner Lagrangian Roche surfaces enclosing binary components.
 */

import { LineLoop, BufferGeometry, LineBasicMaterial, Group, Vector3 } from 'three';

export class RocheLobesVisualizer {
  public group: Group;

  constructor(star1Pos: Vector3, star2Pos: Vector3, rL1: number, rL2: number) {
    this.group = new Group();

    // Primary lobe outline
    const pts1: Vector3[] = [];
    const pts2: Vector3[] = [];
    const segments = 48;

    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // Slight teardrop distortion towards L1
      const pinch1 = 1.0 - 0.25 * Math.cos(theta);
      pts1.push(new Vector3(
        star1Pos.x + Math.cos(theta) * rL1 * pinch1,
        star1Pos.y,
        star1Pos.z + Math.sin(theta) * rL1
      ));

      const pinch2 = 1.0 + 0.25 * Math.cos(theta);
      pts2.push(new Vector3(
        star2Pos.x + Math.cos(theta) * rL2 * pinch2,
        star2Pos.y,
        star2Pos.z + Math.sin(theta) * rL2
      ));
    }

    const mat = new LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 });

    const geom1 = new BufferGeometry().setFromPoints(pts1);
    this.group.add(new LineLoop(geom1, mat));

    const geom2 = new BufferGeometry().setFromPoints(pts2);
    this.group.add(new LineLoop(geom2, mat));
  }
}
