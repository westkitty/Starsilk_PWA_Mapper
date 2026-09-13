/**
 * Smart Camera Focus & Frustum Framing.
 * Calculates optimal camera distance and framing target to smoothly envelop celestial bodies and satellites.
 */

import { Vector3D } from '../simulation/types';

export interface CameraFramingTarget {
  targetCenter: Vector3D;
  cameraDistance: number;
  boundingRadiusKm: number;
}

export function computeBodyFraming(
  bodyPosition: Vector3D,
  bodyRadiusKm: number,
  fovDegrees = 45,
  aspectRatio = 16 / 9,
  margin = 2.5
): CameraFramingTarget {
  const fovRad = (fovDegrees * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovRad / 2) * aspectRatio);
  const minFov = Math.min(fovRad, fovH);

  // Minimum viewing distance so the sphere comfortably fits inside frustum
  const distance = Math.max(bodyRadiusKm * margin, (bodyRadiusKm * margin) / Math.sin(minFov / 2));

  return {
    targetCenter: { ...bodyPosition },
    cameraDistance: distance,
    boundingRadiusKm: bodyRadiusKm,
  };
}

export function computeClusterFraming(
  primaryPosition: Vector3D,
  satellitePositions: Vector3D[],
  fovDegrees = 45,
  margin = 1.3
): CameraFramingTarget {
  let maxDist = 1000;

  for (const p of satellitePositions) {
    const dx = p.x - primaryPosition.x;
    const dy = p.y - primaryPosition.y;
    const dz = p.z - primaryPosition.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDist) maxDist = d;
  }

  const fovRad = (fovDegrees * Math.PI) / 180;
  const distance = (maxDist * margin) / Math.sin(fovRad / 2);

  return {
    targetCenter: { ...primaryPosition },
    cameraDistance: distance,
    boundingRadiusKm: maxDist,
  };
}
