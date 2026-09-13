/**
 * ASSET09: 3D Velocity & Acceleration Arrows.
 * Directional vector gizmos projected in world space.
 */

import * as THREE from "three";

export function createVelocityArrow(
  direction: THREE.Vector3 | { x: number; y: number; z: number },
  length: number = 10,
  colorHex: number = 0x38bdf8
): THREE.ArrowHelper {
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
  return new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), length, colorHex, length * 0.25, length * 0.15);
}
