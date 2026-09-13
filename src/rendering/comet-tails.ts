/**
 * ASSET07: Comet Ion & Dust Tails.
 * Anti-solar particle geometry for highly eccentric bodies approaching periapsis.
 */

import * as THREE from "three";

export function createCometTailMesh(length: number = 30, colorHex: number = 0x67e8f9): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(2.5, length, 16, 1, true);
  geometry.translate(0, -length / 2, 0);
  geometry.rotateX(Math.PI / 2);

  const material = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
