/**
 * ASSET13: Eclipse Umbra/Penumbra Shadow Cones.
 * Volumetric shadow cylinders cast by moons and planets across orbital space.
 */

import * as THREE from "three";

export function createShadowConeMesh(bodyRadius: number, shadowLength: number = 60): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(bodyRadius * 0.95, bodyRadius * 1.5, shadowLength, 24, 1, true);
  geom.rotateX(Math.PI / 2);
  geom.translate(0, 0, shadowLength / 2);

  const mat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  return new THREE.Mesh(geom, mat);
}
