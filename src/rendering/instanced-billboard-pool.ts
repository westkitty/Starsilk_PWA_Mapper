/**
 * Instanced Billboard Particle Pool.
 * Manages an InstancedMesh of camera-facing quads with per-instance matrix and color buffers.
 */

import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Matrix4,
  Vector3,
  Color,
  DynamicDrawUsage,
} from 'three';

export class InstancedBillboardPool {
  public mesh: InstancedMesh;
  private dummyMatrix: Matrix4 = new Matrix4();
  private maxCount: number;

  constructor(maxCount = 10000, color = 0xffffff) {
    this.maxCount = maxCount;
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.mesh = new InstancedMesh(geometry, material, maxCount);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
  }

  public setParticle(index: number, position: Vector3, scale: number, color?: Color): void {
    if (index >= this.maxCount) return;

    this.dummyMatrix.makeScale(scale, scale, scale);
    this.dummyMatrix.setPosition(position);
    this.mesh.setMatrixAt(index, this.dummyMatrix);

    if (color && this.mesh.instanceColor) {
      this.mesh.setColorAt(index, color);
    }
  }

  public commit(activeCount: number): void {
    this.mesh.count = Math.min(activeCount, this.maxCount);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
