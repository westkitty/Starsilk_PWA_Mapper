/**
 * ASSET08: Lagrange Point Marker Visuals.
 * Holographic L1–L5 markers calculated dynamically for primary-secondary celestial pairs.
 */

import * as THREE from "three";

export function createLagrangeGlyph(label: string = "L1"): THREE.Group {
  const group = new THREE.Group();
  group.name = `lagrange-${label}`;

  // Outer glowing diamond ring
  const circleGeom = new THREE.RingGeometry(1.2, 1.5, 4);
  circleGeom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(circleGeom, mat);
  group.add(mesh);
  return group;
}
