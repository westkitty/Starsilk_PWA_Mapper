/**
 * Volumetric Planetary Shadow Cylinders.
 * Projects cylindrical or conical shadow volumes extending away from the host star.
 */

import * as THREE from 'three';

export interface ShadowCylinderOptions {
  planetRadius: number;
  shadowLength?: number;
  shadowColor?: number;
}

export function createShadowCylinder(options: ShadowCylinderOptions): THREE.Mesh {
  const r = options.planetRadius;
  const length = options.shadowLength || r * 25.0;
  const color = options.shadowColor || 0x0f172a; // Deep slate black

  const geometry = new THREE.CylinderGeometry(r * 0.98, r * 1.15, length, 32, 1, true);
  // Shift pivot so top base aligns with planet center
  geometry.translate(0, length / 2, 0);

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35,
    side: THREE.BackSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
