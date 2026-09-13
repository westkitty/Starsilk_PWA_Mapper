/**
 * Occlusion & View-Frustum Culling Governor.
 * Determines visibility of bodies and particle swarms against camera frustum and planetary horizons.
 */

import { Frustum, Matrix4, Vector3, Sphere } from 'three';

export interface CullableItem {
  id: string;
  position: Vector3;
  boundingRadius: number;
}

export class OcclusionCuller {
  private frustum: Frustum = new Frustum();
  private projScreenMatrix: Matrix4 = new Matrix4();
  private sphereHelper: Sphere = new Sphere();

  public updateCamera(projectionMatrix: Matrix4, viewMatrix: Matrix4): void {
    this.projScreenMatrix.multiplyMatrices(projectionMatrix, viewMatrix);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  public isVisible(position: Vector3, radius: number): boolean {
    this.sphereHelper.center.copy(position);
    this.sphereHelper.radius = radius;
    return this.frustum.intersectsSphere(this.sphereHelper);
  }

  /**
   * Evaluates if a distant target is occluded by an opaque foreground body.
   */
  public isOccludedByBody(
    cameraPos: Vector3,
    targetPos: Vector3,
    occluderPos: Vector3,
    occluderRadius: number
  ): boolean {
    const toTarget = new Vector3().subVectors(targetPos, cameraPos);
    const distTarget = toTarget.length();
    if (distTarget === 0) return false;
    toTarget.normalize();

    const toOccluder = new Vector3().subVectors(occluderPos, cameraPos);
    const projDist = toOccluder.dot(toTarget);

    // Occluder must be in front of camera and closer than the target
    if (projDist <= 0 || projDist >= distTarget) return false;

    // Perpendicular distance from occluder to ray
    const closestPoint = new Vector3().copy(cameraPos).addScaledVector(toTarget, projDist);
    const perpDist = closestPoint.distanceTo(occluderPos);

    return perpDist < occluderRadius;
  }
}
