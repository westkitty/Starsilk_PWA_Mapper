/**
 * Orbital-Plane & Inclination Gizmo (#49).
 * 
 * Provides visual instrumentation and physical inclination adjustment for bound orbits:
 * - Orbital plane disc oriented along angular momentum vector h = r x v
 * - Normal axis vector pointing perpendicular to orbital plane
 * - Line of nodes indicating ascending and descending nodes
 * - Physical velocity rotation around nodal axis to commit true physical inclination changes
 */

import * as THREE from "three";
import { CelestialBody, Vector3D } from "../simulation/types";
import { ScaleTransform } from "./scale-transform";
import { FloatingOrigin } from "./floating-origin";
import { calculateOsculatingElements } from "../simulation/orbital-mechanics";

export interface PlaneGizmoState {
  inclinationDeg: number;
  semiMajorAxisKm: number;
  normalVector: Vector3D;
  nodesVector: Vector3D;
}

export class OrbitalPlaneGizmo {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  private planeMesh: THREE.Mesh;
  private normalArrow: THREE.ArrowHelper;
  private nodesLine: THREE.Line;
  private planeGeo: THREE.RingGeometry;
  private planeMat: THREE.MeshBasicMaterial;

  private currentState: PlaneGizmoState | null = null;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = "OrbitalPlaneGizmoGroup";
    this.group.visible = false;

    // Plane ring disc
    this.planeGeo = new THREE.RingGeometry(10, 50, 64);
    this.planeMat = new THREE.MeshBasicMaterial({
      color: 0x0cc6ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.planeMesh = new THREE.Mesh(this.planeGeo, this.planeMat);
    this.planeMesh.rotation.x = Math.PI / 2;
    this.group.add(this.planeMesh);

    // Normal arrow
    const normalDir = new THREE.Vector3(0, 1, 0);
    this.normalArrow = new THREE.ArrowHelper(normalDir, new THREE.Vector3(0, 0, 0), 20, 0x49e7ff, 4, 2);
    this.group.add(this.normalArrow);

    // Line of nodes
    const nodesGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-60, 0, 0),
      new THREE.Vector3(60, 0, 0),
    ]);
    const nodesMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.6,
    });
    this.nodesLine = new THREE.Line(nodesGeo, nodesMat);
    this.nodesLine.computeLineDistances();
    this.group.add(this.nodesLine);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getState(): PlaneGizmoState | null {
    return this.currentState;
  }

  public update(selectedBody: CelestialBody | null, primaryBody: CelestialBody | null): void {
    if (!selectedBody || !primaryBody || selectedBody.id === primaryBody.id) {
      this.group.visible = false;
      this.currentState = null;
      return;
    }

    const elements = calculateOsculatingElements(selectedBody, primaryBody);
    if (!elements || !elements.isBound) {
      this.group.visible = false;
      this.currentState = null;
      return;
    }

    this.group.visible = true;

    // Center at primary body display position
    const primRel = this.floatingOrigin.toRelative(primaryBody.position);
    const primDisp = this.scaleTransform.getDisplayPosition(primRel);
    this.group.position.set(primDisp.x, primDisp.y, primDisp.z);

    // Relative vectors
    const rx = selectedBody.position.x - primaryBody.position.x;
    const ry = selectedBody.position.y - primaryBody.position.y;
    const rz = selectedBody.position.z - primaryBody.position.z;
    const vx = selectedBody.velocity.x - primaryBody.velocity.x;
    const vy = selectedBody.velocity.y - primaryBody.velocity.y;
    const vz = selectedBody.velocity.z - primaryBody.velocity.z;

    // Angular momentum h = r x v
    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const hMag = Math.hypot(hx, hy, hz);

    if (hMag < 1e-8) {
      this.group.visible = false;
      return;
    }

    const hNorm = new THREE.Vector3(hx / hMag, hy / hMag, hz / hMag);
    this.normalArrow.setDirection(hNorm);

    // Orient plane mesh to align with normal hNorm
    // Default ring geometry normal is (0, 0, 1), so we rotate to hNorm
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, hNorm);
    this.planeMesh.quaternion.copy(quat);

    // Line of nodes: vector n = k x h = (-hy, hx, 0)
    const nx = -hy;
    const nz = hx;
    const nMag = Math.hypot(nx, nz);

    if (nMag > 1e-6) {
      const nNorm = new THREE.Vector3(nx / nMag, 0, nz / nMag);
      const nodeLength = Math.max(30, elements.semiMajorAxisKm * ScaleTransform.SCENE_UNITS_PER_KM * 1.2);
      const points = [
        nNorm.clone().multiplyScalar(-nodeLength),
        nNorm.clone().multiplyScalar(nodeLength),
      ];
      this.nodesLine.geometry.dispose();
      this.nodesLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.nodesLine.computeLineDistances();
      this.nodesLine.visible = true;
    } else {
      this.nodesLine.visible = false;
    }

    // Scale plane disc radius to match semi-major axis
    const dispRadius = Math.max(15, elements.semiMajorAxisKm * ScaleTransform.SCENE_UNITS_PER_KM);
    this.planeMesh.scale.set(dispRadius / 50, dispRadius / 50, 1);

    const incRelY = (Math.acos(Math.max(-1, Math.min(1, Math.abs(hNorm.y)))) * 180.0) / Math.PI;
    this.currentState = {
      inclinationDeg: incRelY,
      semiMajorAxisKm: elements.semiMajorAxisKm,
      normalVector: { x: hNorm.x, y: hNorm.y, z: hNorm.z },
      nodesVector: { x: nx / (nMag || 1), y: 0, z: nz / (nMag || 1) },
    };
  }

  /**
   * Physically adjusts the inclination of the selected body by rotating its velocity vector
   * around the line of nodes in true simulation coordinates.
   */
  public applyInclinationDelta(
    body: CelestialBody,
    primary: CelestialBody,
    deltaInclinationDeg: number
  ): Vector3D {
    const rx = body.position.x - primary.position.x;
    const ry = body.position.y - primary.position.y;
    const rz = body.position.z - primary.position.z;
    const vx = body.velocity.x - primary.velocity.x;
    const vy = body.velocity.y - primary.velocity.y;
    const vz = body.velocity.z - primary.velocity.z;

    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;

    // Nodal axis n = (-hy, 0, hx)
    let nx = -hy;
    let nz = hx;
    let nMag = Math.hypot(nx, nz);

    let axis: THREE.Vector3;
    if (nMag > 1e-6) {
      axis = new THREE.Vector3(nx / nMag, 0, nz / nMag);
    } else {
      // Degenerate orbit in XY plane: use position vector as rotation axis
      axis = new THREE.Vector3(rx, ry, rz).normalize();
    }

    const angleRad = THREE.MathUtils.degToRad(deltaInclinationDeg);
    const vVec = new THREE.Vector3(vx, vy, vz);
    vVec.applyAxisAngle(axis, angleRad);

    body.velocity.x = primary.velocity.x + vVec.x;
    body.velocity.y = primary.velocity.y + vVec.y;
    body.velocity.z = primary.velocity.z + vVec.z;

    return { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
  }

  public rotateInclination(
    body: CelestialBody,
    primary: CelestialBody,
    deltaIncRad: number
  ): Vector3D {
    return this.applyInclinationDelta(body, primary, THREE.MathUtils.radToDeg(deltaIncRad));
  }

  public clear(): void {
    this.group.visible = false;
    this.currentState = null;
  }

  public dispose(): void {
    this.clear();
    this.planeGeo.dispose();
    this.planeMat.dispose();
    this.nodesLine.geometry.dispose();
    (this.nodesLine.material as THREE.Material).dispose();
  }
}
