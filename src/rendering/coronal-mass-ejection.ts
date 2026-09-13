/**
 * Coronal Mass Ejection (CME) Expanding Plasma Particle Shell.
 * Renders an expanding, magnetized plasma torus/bubble sweeping outwards from a star.
 */

import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, Vector3 } from 'three';

export class CoronalMassEjectionVisualizer {
  public points: Points;
  private geometry: BufferGeometry;
  private currentRadius = 1.0;
  private maxRadius: number;
  private expansionSpeed: number;
  public isComplete = false;

  constructor(origin: Vector3, maxRadius = 30.0, expansionSpeed = 1.5, count = 1200) {
    this.maxRadius = maxRadius;
    this.expansionSpeed = expansionSpeed;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Angular cone distribution
      const theta = (Math.random() - 0.5) * 0.8;
      const phi = Math.random() * 2 * Math.PI;
      positions[i * 3] = Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = Math.sin(theta);
      positions[i * 3 + 2] = Math.cos(theta) * Math.sin(phi);
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color: 0xf97316,
      size: 0.35,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.points = new Points(this.geometry, material);
    this.points.position.copy(origin);
  }

  public update(dt: number): void {
    if (this.isComplete) return;
    this.currentRadius += this.expansionSpeed * dt;
    this.points.scale.set(this.currentRadius, this.currentRadius, this.currentRadius);

    if (this.currentRadius >= this.maxRadius) {
      this.isComplete = true;
      (this.points.material as PointsMaterial).opacity = 0;
    } else {
      (this.points.material as PointsMaterial).opacity = 0.75 * (1 - this.currentRadius / this.maxRadius);
    }
  }
}
