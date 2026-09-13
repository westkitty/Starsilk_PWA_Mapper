/**
 * ASSET14: Space Station Modular Geometries.
 * Procedural meshes for orbital habitats (spindle, habitat toroid ring, solar panels).
 */

import * as THREE from "three";

export function createStationMesh(): THREE.Group {
  const group = new THREE.Group();

  const matHull = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.8 });
  const matSolar = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.2, metalness: 0.9 });

  // Central Spindle
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 12), matHull);
  group.add(spindle);

  // Rotating Habitat Toroid
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.25, 12, 32), matHull);
  torus.rotateX(Math.PI / 2);
  group.add(torus);

  // Solar Arrays
  const panel1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.8), matSolar);
  panel1.position.set(0, 1.8, 0);
  group.add(panel1);

  const panel2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.8), matSolar);
  panel2.position.set(0, -1.8, 0);
  group.add(panel2);

  return group;
}
