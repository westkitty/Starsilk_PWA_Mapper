/**
 * Relativistic Doppler Shift & Beaming Tint.
 * Shifts object apparent color toward blue (approaching) or red (receding)
 * based on line-of-sight radial velocity.
 */

import * as THREE from 'three';
import { Vector3D } from '../simulation/types';

// Speed of light in km/s
const C_KM_S = 299792.458;

export function calculateDopplerTint(
  bodyVelocity: Vector3D,
  cameraDirection: Vector3D,
  baseColorHex: number
): THREE.Color {
  // Radial velocity = dot(v, camera_dir)
  const vRadial = bodyVelocity.x * cameraDirection.x +
                  bodyVelocity.y * cameraDirection.y +
                  bodyVelocity.z * cameraDirection.z;

  const beta = Math.max(-0.95, Math.min(0.95, vRadial / C_KM_S));

  // Relativistic Doppler factor: D = sqrt((1 - beta) / (1 + beta))
  // Approaching (beta < 0) => D > 1 (blueshift); Receding (beta > 0) => D < 1 (redshift)
  const dopplerFactor = Math.sqrt((1 - beta) / (1 + beta));

  const color = new THREE.Color(baseColorHex);

  if (dopplerFactor > 1.0001) {
    // Blueshift: boost blue and cyan
    const shift = Math.min(1.0, (dopplerFactor - 1.0) * 10.0);
    color.lerp(new THREE.Color(0x38bdf8), shift * 0.5);
  } else if (dopplerFactor < 0.9999) {
    // Redshift: boost red and amber
    const shift = Math.min(1.0, (1.0 - dopplerFactor) * 10.0);
    color.lerp(new THREE.Color(0xef4444), shift * 0.5);
  }

  return color;
}
