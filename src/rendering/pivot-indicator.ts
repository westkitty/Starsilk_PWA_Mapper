/**
 * Transient Pivot Indicator (#41).
 * 
 * Renders a subtle, non-intrusive reticle ring at the camera pivot point
 * that fades out smoothly when camera manipulation ceases.
 */

import * as THREE from "three";

export class PivotIndicator {
  private group: THREE.Group;
  private ringMesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "PivotIndicatorGroup";

    const geo = new THREE.RingGeometry(0.8, 1.0, 32);
    this.material = new THREE.MeshBasicMaterial({
      color: 0x0cc6ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    this.ringMesh = new THREE.Mesh(geo, this.material);
    this.ringMesh.renderOrder = 999;
    this.group.add(this.ringMesh);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public update(position: THREE.Vector3, opacity: number, camera: THREE.Camera): void {
    if (opacity <= 0.005) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.group.position.copy(position);
    this.material.opacity = Math.max(0, Math.min(0.8, opacity));

    // Scale with camera distance so indicator stays visually constant on screen (~24px)
    const dist = camera.position.distanceTo(position);
    const scale = Math.max(0.5, dist * 0.025);
    this.ringMesh.scale.set(scale, scale, scale);

    // Billboarding: face camera
    this.ringMesh.quaternion.copy(camera.quaternion);
  }

  public dispose(): void {
    this.ringMesh.geometry.dispose();
    this.material.dispose();
  }
}
