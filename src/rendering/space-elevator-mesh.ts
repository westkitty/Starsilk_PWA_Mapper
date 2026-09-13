/**
 * Space Elevator Tether & Counterweight Visualizer.
 * Renders the radial carbon-nanotube ribbon and counterweight habitat.
 */

import { Line, BufferGeometry, LineBasicMaterial, Mesh, SphereGeometry, MeshStandardMaterial, Group, Vector3 } from 'three';

export class SpaceElevatorVisualizer {
  public group: Group;
  private line: Line;
  private counterweight: Mesh;

  constructor(surfaceRadius = 1.0, counterweightRadius = 6.0) {
    this.group = new Group();

    const points = [
      new Vector3(surfaceRadius, 0, 0),
      new Vector3(counterweightRadius, 0, 0),
    ];
    const geom = new BufferGeometry().setFromPoints(points);
    const lineMat = new LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    this.line = new Line(geom, lineMat);
    this.group.add(this.line);

    const sphereGeom = new SphereGeometry(0.12, 16, 16);
    const sphereMat = new MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    this.counterweight = new Mesh(sphereGeom, sphereMat);
    this.counterweight.position.set(counterweightRadius, 0, 0);
    this.group.add(this.counterweight);
  }

  public updateRotation(angleRad: number): void {
    this.group.rotation.y = angleRad;
  }
}
