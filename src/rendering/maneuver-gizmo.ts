/**
 * Maneuver Node Tangent Handle Gizmo.
 * 3D visual handle displaying prograde (yellow), normal (purple), and radial (cyan) vectors.
 */

import * as THREE from 'three';

export interface ManeuverGizmoOptions {
  handleScale?: number;
}

export function createManeuverGizmo(options: ManeuverGizmoOptions = {}): THREE.Group {
  const group = new THREE.Group();
  const scale = options.handleScale || 10.0;

  // Prograde / Retrograde (tangent): Yellow / Orange along X
  const progradeGeo = new THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale, 8);
  progradeGeo.translate(0, scale / 2, 0);
  progradeGeo.rotateZ(-Math.PI / 2); // along +X

  const progradeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false });
  const progradeMesh = new THREE.Mesh(progradeGeo, progradeMat);
  group.add(progradeMesh);

  // Normal / Anti-normal (out-of-plane): Magenta / Purple along Z
  const normalGeo = new THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale, 8);
  normalGeo.translate(0, scale / 2, 0);
  normalGeo.rotateX(Math.PI / 2); // along +Z

  const normalMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, depthTest: false });
  const normalMesh = new THREE.Mesh(normalGeo, normalMat);
  group.add(normalMesh);

  // Radial in / out: Cyan along Y
  const radialGeo = new THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale, 8);
  radialGeo.translate(0, scale / 2, 0); // along +Y

  const radialMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
  const radialMesh = new THREE.Mesh(radialGeo, radialMat);
  group.add(radialMesh);

  // Center node sphere
  const centerGeo = new THREE.SphereGeometry(scale * 0.15, 16, 16);
  const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  group.add(new THREE.Mesh(centerGeo, centerMat));

  group.renderOrder = 999; // Always render on top
  return group;
}
