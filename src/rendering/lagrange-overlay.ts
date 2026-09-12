/**
 * L1–L5 Lagrange Points Spatial Instrumentation.
 *
 * Invariants:
 * - Rendered strictly for an explicitly selected secondary body and its dominant primary.
 *   Never spawned for all body pairs simultaneously.
 * - L1/L2/L3: Compact collinear saddle-point instrumentation (perpendicular saddle ticks + diamond center).
 * - L4/L5: Restrained triangular/Trojan geometry (subtle equilateral connector lines + Trojan diamonds).
 * - Non-selectable: raycast isolated; zero simulation mutation.
 * - Screen-legible: scale adapts with camera distance to preserve instrument readability.
 * - Full Three.js lifecycle resource disposal.
 */

import * as THREE from 'three';
import { CelestialBody, Vector3D } from '../simulation/types';
import { computeLagrangePoints, LagrangePoints } from '../simulation/orbital-mechanics';
import { ScaleTransform } from './scale-transform';
import { FloatingOrigin } from './floating-origin';

export class LagrangeOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  // Visual sub-elements
  private markers: Map<string, THREE.Mesh> = new Map();
  private trojanLines: THREE.LineSegments;
  private trojanGeo: THREE.BufferGeometry;

  // Collinear saddle bars for L1, L2, L3
  private saddleBars: THREE.LineSegments;
  private saddleGeo: THREE.BufferGeometry;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = 'LagrangeOverlayGroup';
    this.group.visible = false;

    // Shared diamond geometry
    const markerGeo = new THREE.OctahedronGeometry(1.0, 0);

    // Marker colors: L1/L2/L3 azure-cyan (#38bdf8), L4/L5 Trojan amber-gold (#f59e0b)
    const collinearMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const trojanMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    // Initialize markers for L1..L5
    const names = ['L1', 'L2', 'L3', 'L4', 'L5'];
    for (const name of names) {
      const mat = name === 'L4' || name === 'L5' ? trojanMat : collinearMat;
      const mesh = new THREE.Mesh(markerGeo, mat);
      mesh.name = `lagrange-${name}`;
      mesh.visible = false;
      this.markers.set(name, mesh);
      this.group.add(mesh);
    }

    // Collinear saddle bars (perpendicular tick bars for L1, L2, L3)
    // 3 points * 2 vertices per bar = 6 vertices (18 floats)
    this.saddleGeo = new THREE.BufferGeometry();
    this.saddleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    const saddleMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.saddleBars = new THREE.LineSegments(this.saddleGeo, saddleMat);
    this.group.add(this.saddleBars);

    // Trojan connector lines (Primary -> L4 -> Secondary, Primary -> L5 -> Secondary)
    // 4 segments = 8 vertices (24 floats)
    this.trojanGeo = new THREE.BufferGeometry();
    this.trojanGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24), 3));
    const trojanLineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trojanLines = new THREE.LineSegments(this.trojanGeo, trojanLineMat);
    this.group.add(this.trojanLines);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) {
      this.clear();
    }
  }

  /**
   * Update L1–L5 Lagrange markers for the active primary-secondary pair.
   */
  public update(
    secondary: CelestialBody | null,
    primary: CelestialBody | null,
    camera: THREE.Camera
  ): void {
    if (!secondary || !primary || secondary.id === primary.id) {
      this.clear();
      return;
    }

    // Compute approximate Lagrange points
    const lp: LagrangePoints | null = computeLagrangePoints(primary, secondary);
    if (!lp) {
      this.clear();
      return;
    }

    this.group.visible = true;

    // Display coordinates for Primary and Secondary
    const primDisp = this.scaleTransform.getDisplayPosition(this.floatingOrigin.toRelative(primary.position));
    const secDisp = this.scaleTransform.getDisplayPosition(this.floatingOrigin.toRelative(secondary.position));

    // Direction vector between primary and secondary in display space
    const dir = new THREE.Vector3(secDisp.x - primDisp.x, secDisp.y - primDisp.y, secDisp.z - primDisp.z).normalize();
    // In-plane perpendicular
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    // Map display positions for L1 through L5
    const dispPoints: Record<string, THREE.Vector3> = {
      L1: this.toDisplayVector(lp.L1),
      L2: this.toDisplayVector(lp.L2),
      L3: this.toDisplayVector(lp.L3),
      L4: this.toDisplayVector(lp.L4),
      L5: this.toDisplayVector(lp.L5),
    };

    // Calculate adaptive screen scale based on camera distance
    const camDist = camera.position.distanceTo(secDisp);
    const markerScale = Math.max(0.6, Math.min(18.0, camDist * 0.008));

    // Update marker meshes
    for (const [name, mesh] of this.markers) {
      const p = dispPoints[name];
      if (p) {
        mesh.position.copy(p);
        mesh.scale.set(markerScale, markerScale, markerScale);
        mesh.visible = true;
      }
    }

    // Update collinear saddle bars for L1, L2, L3
    const saddlePositions = (this.saddleGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const barHalfLen = markerScale * 1.8;
    const collinearKeys = ['L1', 'L2', 'L3'];

    for (let i = 0; i < collinearKeys.length; i++) {
      const p = dispPoints[collinearKeys[i]];
      const idx = i * 6;
      saddlePositions[idx] = p.x - perp.x * barHalfLen;
      saddlePositions[idx + 1] = p.y - perp.y * barHalfLen;
      saddlePositions[idx + 2] = p.z - perp.z * barHalfLen;

      saddlePositions[idx + 3] = p.x + perp.x * barHalfLen;
      saddlePositions[idx + 4] = p.y + perp.y * barHalfLen;
      saddlePositions[idx + 5] = p.z + perp.z * barHalfLen;
    }
    this.saddleGeo.attributes.position.needsUpdate = true;
    this.saddleBars.visible = true;

    // Update Trojan equilateral connector lines:
    // Seg 1: Primary -> L4
    // Seg 2: L4 -> Secondary
    // Seg 3: Primary -> L5
    // Seg 4: L5 -> Secondary
    const trojanPositions = (this.trojanGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const l4 = dispPoints.L4;
    const l5 = dispPoints.L5;

    // Prim -> L4
    trojanPositions[0] = primDisp.x; trojanPositions[1] = primDisp.y; trojanPositions[2] = primDisp.z;
    trojanPositions[3] = l4.x; trojanPositions[4] = l4.y; trojanPositions[5] = l4.z;

    // L4 -> Sec
    trojanPositions[6] = l4.x; trojanPositions[7] = l4.y; trojanPositions[8] = l4.z;
    trojanPositions[9] = secDisp.x; trojanPositions[10] = secDisp.y; trojanPositions[11] = secDisp.z;

    // Prim -> L5
    trojanPositions[12] = primDisp.x; trojanPositions[13] = primDisp.y; trojanPositions[14] = primDisp.z;
    trojanPositions[15] = l5.x; trojanPositions[16] = l5.y; trojanPositions[17] = l5.z;

    // L5 -> Sec
    trojanPositions[18] = l5.x; trojanPositions[19] = l5.y; trojanPositions[20] = l5.z;
    trojanPositions[21] = secDisp.x; trojanPositions[22] = secDisp.y; trojanPositions[23] = secDisp.z;

    this.trojanGeo.attributes.position.needsUpdate = true;
    this.trojanLines.computeLineDistances();
    this.trojanLines.visible = true;
  }

  private toDisplayVector(ptKm: Vector3D): THREE.Vector3 {
    const rel = this.floatingOrigin.toRelative(ptKm);
    const disp = this.scaleTransform.getDisplayPosition(rel);
    return new THREE.Vector3(disp.x, disp.y, disp.z);
  }

  public clear(): void {
    this.group.visible = false;
    for (const [, mesh] of this.markers) {
      mesh.visible = false;
    }
    this.saddleBars.visible = false;
    this.trojanLines.visible = false;
  }

  public dispose(): void {
    this.clear();
    for (const [, mesh] of this.markers) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.group.remove(mesh);
    }
    this.markers.clear();

    this.saddleGeo.dispose();
    (this.saddleBars.material as THREE.Material).dispose();

    this.trojanGeo.dispose();
    (this.trojanLines.material as THREE.Material).dispose();
  }
}
