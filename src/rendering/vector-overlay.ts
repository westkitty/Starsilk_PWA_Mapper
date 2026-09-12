/**
 * Velocity and Acceleration Vector Visualizer (#48).
 * 
 * Computes and renders adaptive vector instrumentation for the selected celestial body:
 * - Current physical velocity vector (tangent to orbit, azure)
 * - Net Newtonian gravitational acceleration vector (pointing along gravity gradient, amber)
 * - Scale-adaptive arrow lengths that remain clearly visible without distorting physics
 */

import * as THREE from "three";
import { CelestialBody, Vector3D } from "../simulation/types";
import { ScaleTransform } from "./scale-transform";
import { FloatingOrigin } from "./floating-origin";
import { G_KM } from "../simulation/units";

export interface VectorTelemetry {
  velocityKmS: Vector3D;
  velocityMagnitudeKmS: number;
  accelerationKmS2: Vector3D;
  accelerationMS2: number;
  isNormalizedDisplay: boolean;
}

export class VectorOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  private velocityArrow: THREE.ArrowHelper;
  private accelArrow: THREE.ArrowHelper;

  private currentTelemetry: VectorTelemetry | null = null;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = "VectorOverlayGroup";
    this.group.visible = false;

    // Velocity arrow (azure #0cc6ff)
    const velDir = new THREE.Vector3(1, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    this.velocityArrow = new THREE.ArrowHelper(velDir, origin, 15, 0x0cc6ff, 4, 2);
    this.group.add(this.velocityArrow);

    // Acceleration arrow (amber #f59e0b)
    const accDir = new THREE.Vector3(0, 0, 1);
    this.accelArrow = new THREE.ArrowHelper(accDir, origin, 12, 0xf59e0b, 3.5, 1.8);
    this.group.add(this.accelArrow);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getTelemetry(): VectorTelemetry | null {
    return this.currentTelemetry;
  }

  public update(selectedBody: CelestialBody | null, allBodies: CelestialBody[]): void {
    if (!selectedBody) {
      this.group.visible = false;
      this.currentTelemetry = null;
      return;
    }

    this.group.visible = true;

    // 1. Position vector origin at body display position
    const relKm = this.floatingOrigin.toRelative(selectedBody.position);
    const disp = this.scaleTransform.getDisplayPosition(relKm);
    this.group.position.set(disp.x, disp.y, disp.z);

    // 2. Velocity vector
    const vx = selectedBody.velocity.x;
    const vy = selectedBody.velocity.y;
    const vz = selectedBody.velocity.z;
    const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz);

    if (vMag > 0.0001) {
      const vDir = new THREE.Vector3(vx, vy, vz).normalize();
      this.velocityArrow.setDirection(vDir);
      // Adaptive visual length: logarithmic scaling so arrows are legible from 5 to 60 units
      const vDisplayLen = Math.max(8.0, Math.min(45.0, 12.0 + Math.log10(vMag + 1) * 8.0));
      this.velocityArrow.setLength(vDisplayLen, vDisplayLen * 0.25, vDisplayLen * 0.12);
      this.velocityArrow.visible = true;
    } else {
      this.velocityArrow.visible = false;
    }

    // 3. Compute net gravitational acceleration vector: a = sum(G * M_j / r^2)
    let ax = 0;
    let ay = 0;
    let az = 0;

    for (const other of allBodies) {
      if (other.id === selectedBody.id) continue;
      const dx = other.position.x - selectedBody.position.x;
      const dy = other.position.y - selectedBody.position.y;
      const dz = other.position.z - selectedBody.position.z;
      const distSq = dx * dx + dy * dy + dz * dz + 1.0;
      const dist = Math.sqrt(distSq);
      const forceMag = (G_KM * other.massKg) / distSq;

      ax += forceMag * (dx / dist);
      ay += forceMag * (dy / dist);
      az += forceMag * (dz / dist);
    }

    const aMagKmS2 = Math.sqrt(ax * ax + ay * ay + az * az);
    const aMagMS2 = aMagKmS2 * 1000.0; // km/s^2 to m/s^2

    if (aMagKmS2 > 1e-12) {
      const aDir = new THREE.Vector3(ax, ay, az).normalize();
      this.accelArrow.setDirection(aDir);
      const aDisplayLen = Math.max(6.0, Math.min(38.0, 10.0 + Math.log10(Math.max(1e-6, aMagMS2) + 1) * 7.0));
      this.accelArrow.setLength(aDisplayLen, aDisplayLen * 0.25, aDisplayLen * 0.12);
      this.accelArrow.visible = true;
    } else {
      this.accelArrow.visible = false;
    }

    this.currentTelemetry = {
      velocityKmS: { x: vx, y: vy, z: vz },
      velocityMagnitudeKmS: vMag,
      accelerationKmS2: { x: ax, y: ay, z: az },
      accelerationMS2: aMagMS2,
      isNormalizedDisplay: true,
    };
  }

  public clear(): void {
    this.group.visible = false;
    this.currentTelemetry = null;
  }

  public dispose(): void {
    // ArrowHelpers dispose their internal line and cone meshes
    this.group.clear();
  }
}
