/**
 * Hill Sphere Boundary Bubble.
 * Visualizes the gravitational sphere of influence (R_H) around planets and moons.
 */

import * as THREE from 'three';

export interface HillSphereMeshOptions {
  hillRadius: number;
  colorHex?: number;
  opacity?: number;
}

export function createHillSphereMesh(options: HillSphereMeshOptions): THREE.Mesh {
  const r = Math.max(1.0, options.hillRadius);
  const color = options.colorHex || 0x06b6d4; // Cyan
  const opacity = options.opacity !== undefined ? options.opacity : 0.15;

  const geometry = new THREE.SphereGeometry(r, 32, 24);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    wireframe: true,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
