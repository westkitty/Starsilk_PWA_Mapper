/**
 * ASSET10: Orbital Plane Polar Graticule.
 * Concentric polar coordinate AU grid with cardinal crosshairs.
 */

import * as THREE from "three";

export function createPolarGraticule(radii: number[] = [10, 20, 50, 100, 200]): THREE.Group {
  const group = new THREE.Group();

  const mat = new THREE.LineBasicMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });

  for (const r of radii) {
    const segments = 64;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geom, mat);
    group.add(line);
  }

  // Crosshairs
  const maxR = radii[radii.length - 1];
  const axisGeom = new THREE.BufferGeometry();
  const axisPos = new Float32Array([
    -maxR, 0, 0,  maxR, 0, 0,
    0, 0, -maxR,  0, 0, maxR
  ]);
  axisGeom.setAttribute("position", new THREE.BufferAttribute(axisPos, 3));
  const axisLine = new THREE.LineSegments(axisGeom, mat);
  group.add(axisLine);

  return group;
}
