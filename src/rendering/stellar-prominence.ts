/**
 * Stellar Coronal Prominence & Magnetic Flux Loop Mesh.
 * Renders looping plasma arches erupting from stellar photospheres.
 */

import * as THREE from 'three';

export interface ProminenceOptions {
  starRadius: number;
  prominenceHeight?: number;
  prominenceColor?: number;
  segments?: number;
}

export function createStellarProminence(options: ProminenceOptions): THREE.Line {
  const r = options.starRadius;
  const height = options.prominenceHeight || r * 0.35;
  const segments = options.segments || 32;
  const color = options.prominenceColor || 0xff4500; // Orange-red plasma

  // Quadratic curve forming a loop arching off the sphere
  const p0 = new THREE.Vector3(r * 0.95, -r * 0.2, 0);
  const p1 = new THREE.Vector3(r + height, 0, 0);
  const p2 = new THREE.Vector3(r * 0.95, r * 0.2, 0);

  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const points = curve.getPoints(segments);

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Line(geometry, material);
}
