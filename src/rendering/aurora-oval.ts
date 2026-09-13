/**
 * Planetary Auroral Oval Visualizer.
 * Generates shimmering polar auroral rings hovering above planetary atmospheres.
 */

import * as THREE from 'three';

export interface AuroraOptions {
  planetRadius: number;
  poleOffsetAltitude?: number;
  colorHex?: number;
  latitudeDeg?: number;
}

export function createAuroraRing(options: AuroraOptions): THREE.Mesh {
  const r = options.planetRadius;
  const altitude = options.poleOffsetAltitude || r * 0.05;
  const latRad = ((options.latitudeDeg || 75) * Math.PI) / 180;
  const color = options.colorHex || 0x10b981; // Vibrant emerald

  const ringRadius = (r + altitude) * Math.cos(latRad);
  const zOffset = (r + altitude) * Math.sin(latRad);

  const geometry = new THREE.RingGeometry(ringRadius * 0.88, ringRadius * 1.12, 64);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, zOffset);

  return mesh;
}
