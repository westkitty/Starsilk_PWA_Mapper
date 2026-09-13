/**
 * ASSET11: Tidal Distortion Spheroid Mesh.
 * Stretches a celestial sphere into a prolate ellipsoid aligned with primary gravitational gradient.
 */

import * as THREE from "three";

export function createTidallyDistortedGeometry(radius: number, stretchFactor: number = 1.25): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(radius, 32, 32);
  const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;

  for (let i = 0; i < posAttr.count; i++) {
    // Elongate along X axis (sub-stellar axis)
    posAttr.setX(i, posAttr.getX(i) * stretchFactor);
  }
  geom.computeVertexNormals();
  return geom;
}
