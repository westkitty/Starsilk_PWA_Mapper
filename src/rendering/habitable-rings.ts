/**
 * ASSET04: Habitable Zone Ribbon Mesh.
 * Renders emerald gradient ribbon marking liquid-water boundaries (0.95 - 1.37 AU equivalent).
 */

import * as THREE from "three";
import { KM_PER_AU } from "../simulation/units";

export function createHabitableZoneMesh(
  starLuminosityW: number = 3.828e26,
  scaleFactor: (km: number) => number = (km) => km / 1000000
): THREE.Mesh {
  // L_rel relative to Sun
  const relLuminosity = starLuminosityW / 3.828e26;
  const innerRadiusKm = 0.95 * Math.sqrt(relLuminosity) * KM_PER_AU;
  const outerRadiusKm = 1.37 * Math.sqrt(relLuminosity) * KM_PER_AU;

  const innerScaled = scaleFactor(innerRadiusKm);
  const outerScaled = scaleFactor(outerRadiusKm);

  const geometry = new THREE.RingGeometry(innerScaled, outerScaled, 64);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Mesh(geometry, material);
}
