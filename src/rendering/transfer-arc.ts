/**
 * Interplanetary Hohmann Transfer Trajectory Arc.
 * Renders an elliptical transfer ribbon connecting departure and arrival orbits with impulse burn markers.
 */

import * as THREE from 'three';

export interface TransferArcConfig {
  r1: number; // Departure radius
  r2: number; // Arrival radius
  departureAngleRad?: number;
  colorHex?: number;
  segments?: number;
}

export function createTransferArcMesh(config: TransferArcConfig): THREE.Line {
  const r1 = config.r1;
  const r2 = config.r2;
  const depAngle = config.departureAngleRad || 0;
  const segments = config.segments || 64;
  const color = config.colorHex || 0x38bdf8; // Sky blue

  // Semi-major axis of transfer ellipse: a_trans = (r1 + r2) / 2
  const a = (r1 + r2) / 2;
  // Eccentricity: e = |r2 - r1| / (r1 + r2)
  const e = Math.abs(r2 - r1) / (r1 + r2);

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const f = (Math.PI * i) / segments; // True anomaly sweeps from 0 to PI (180 degrees)
    // Polar equation of ellipse: r(f) = a * (1 - e^2) / (1 + e * cos(f))
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(f));
    const angle = depAngle + f;

    points.push(new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 3,
    gapSize: 1.5,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}
