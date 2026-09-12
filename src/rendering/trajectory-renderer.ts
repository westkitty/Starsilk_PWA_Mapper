/**
 * Batched Trajectory and Sensitivity Cloud Line Renderer.
 * 
 * Invariants:
 * - Uses project-compatible Three.js wide-line geometry (Line2 / LineGeometry / LineMaterial)
 *   for high-DPI-safe screen-space thickness (~3-5 CSS px for selected, thinner for non-selected).
 * - Stable thickness independent of camera distance.
 * - Directional forward-motion chevrons indicate trajectory ordering and local velocity.
 * - Motion freezes in prefers-reduced-motion mode, preserving static directionality.
 * - Primary trajectory gets prominent azure emphasis (#0CC6FF).
 * - Background trajectories are faint obsidian-azure (#1E3A5F).
 * - Collision segments are highlighted in warning crimson (#FF3344).
 * - Sensitivity cloud renders as a fan of thirty translucent diverging futures.
 */

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Vector3D } from '../simulation/types';
import { ScaleTransform } from './scale-transform';

export interface TrajectoryPoint {
  positionKm: Vector3D;
  timestampSec: number;
  isCollision?: boolean;
  isEscape?: boolean;
}

export interface BodyTrajectoryData {
  bodyId: string;
  points: TrajectoryPoint[];
  isSelected: boolean;
  colorHex?: string;
}

interface LineEntry {
  line: Line2;
  geometry: LineGeometry;
  material: LineMaterial;
  lastPointCount: number;
}

export class TrajectoryRenderer {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;

  // Max points per trajectory line
  private readonly maxPoints = 500;

  // Viewport resolution for LineMaterial
  private resolution: THREE.Vector2 = new THREE.Vector2(1280, 800);

  // Cache of line objects per body
  private lineMap: Map<string, LineEntry> = new Map();

  // Directional chevrons along selected trajectory
  private chevronGroup: THREE.Group;
  private chevronMesh: THREE.InstancedMesh | null = null;
  private readonly maxChevrons = 10;
  private selectedTrajectoryDisplayPoints: THREE.Vector3[] = [];
  private selectedTrajectorySpeeds: number[] = [];
  private chevronPhase: number = 0;
  private reducedMotion: boolean = false;

  // Sensitivity cloud lines
  private sensitivityLines: THREE.LineSegments | null = null;
  private maxSensitivitySegments = 1500;

  constructor(scaleTransform: ScaleTransform, initialWidth = 1280, initialHeight = 800) {
    this.scaleTransform = scaleTransform;
    this.resolution.set(initialWidth, initialHeight);

    this.group = new THREE.Group();
    this.group.name = 'TrajectoryRendererGroup';

    this.chevronGroup = new THREE.Group();
    this.chevronGroup.name = 'DirectionalChevronsGroup';
    this.group.add(this.chevronGroup);

    this.initSensitivityMesh();
    this.initChevronMesh();

    // Check system prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setResolution(width: number, height: number): void {
    this.resolution.set(Math.max(1, width), Math.max(1, height));
    for (const [, entry] of this.lineMap) {
      entry.material.resolution.copy(this.resolution);
    }
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  private initSensitivityMesh(): void {
    const geo = new THREE.BufferGeometry();
    const posBuffer = new Float32Array(this.maxSensitivitySegments * 6); // 2 vertices * 3 coords
    const colBuffer = new Float32Array(this.maxSensitivitySegments * 6);

    geo.setAttribute('position', new THREE.BufferAttribute(posBuffer, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colBuffer, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sensitivityLines = new THREE.LineSegments(geo, mat);
    this.sensitivityLines.visible = false;
    this.group.add(this.sensitivityLines);
  }

  private initChevronMesh(): void {
    // Compact arrowhead/chevron planar triangle: pointing along +Z
    const shape = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -0.6, 0, -0.6,
       0.0, 0,  0.7,
       0.6, 0, -0.6,
    ]);
    shape.setAttribute('position', new THREE.BufferAttribute(verts, 3));

    const mat = new THREE.MeshBasicMaterial({
      color: 0x49e7ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.chevronMesh = new THREE.InstancedMesh(shape, mat, this.maxChevrons);
    this.chevronMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chevronMesh.visible = false;
    this.chevronGroup.add(this.chevronMesh);
  }

  /**
   * Update or create screen-space trajectory ribbon for a body.
   */
  public updateBodyTrajectory(data: BodyTrajectoryData): void {
    let entry = this.lineMap.get(data.bodyId);

    if (!entry) {
      const geometry = new LineGeometry();
      const material = new LineMaterial({
        vertexColors: true,
        transparent: true,
        opacity: data.isSelected ? 0.95 : 0.4,
        linewidth: data.isSelected ? 3.8 : 1.4, // CSS pixels
        resolution: this.resolution,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const line = new Line2(geometry, material);
      this.group.add(line);

      entry = { line, geometry, material, lastPointCount: 0 };
      this.lineMap.set(data.bodyId, entry);
    }

    const ptCount = Math.min(data.points.length, this.maxPoints);
    if (ptCount < 2) {
      entry.line.visible = false;
      if (data.isSelected) {
        this.selectedTrajectoryDisplayPoints = [];
        this.selectedTrajectorySpeeds = [];
        if (this.chevronMesh) this.chevronMesh.visible = false;
      }
      return;
    }

    entry.line.visible = true;
    entry.material.linewidth = data.isSelected ? 3.8 : 1.4;
    entry.material.opacity = data.isSelected ? 0.95 : 0.35;

    const baseColor = new THREE.Color(data.isSelected ? '#0cc6ff' : (data.colorHex || '#1e3a5f'));
    const collisionColor = new THREE.Color('#ff3344');

    const flatPositions = new Float32Array(ptCount * 3);
    const flatColors = new Float32Array(ptCount * 3);

    const displayPoints: THREE.Vector3[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < ptCount; i++) {
      const pt = data.points[i];
      const disp = this.scaleTransform.getDisplayPosition(pt.positionKm);
      flatPositions[i * 3] = disp.x;
      flatPositions[i * 3 + 1] = disp.y;
      flatPositions[i * 3 + 2] = disp.z;

      if (data.isSelected) {
        displayPoints.push(new THREE.Vector3(disp.x, disp.y, disp.z));
        if (i < ptCount - 1) {
          const nextPt = data.points[i + 1];
          const dt = Math.max(0.1, Math.abs(nextPt.timestampSec - pt.timestampSec));
          const dx = nextPt.positionKm.x - pt.positionKm.x;
          const dy = nextPt.positionKm.y - pt.positionKm.y;
          const dz = nextPt.positionKm.z - pt.positionKm.z;
          const distKm = Math.hypot(dx, dy, dz);
          speeds.push(distKm / dt);
        }
      }

      // Color fade along future trajectory
      const alpha = 1.0 - (i / ptCount) * 0.70;
      const c = pt.isCollision ? collisionColor : baseColor;

      flatColors[i * 3] = c.r * alpha;
      flatColors[i * 3 + 1] = c.g * alpha;
      flatColors[i * 3 + 2] = c.b * alpha;
    }

    entry.geometry.setPositions(flatPositions);
    entry.geometry.setColors(flatColors);
    entry.line.computeLineDistances();
    entry.lastPointCount = ptCount;

    // Selected body updates chevrons
    if (data.isSelected) {
      this.selectedTrajectoryDisplayPoints = displayPoints;
      this.selectedTrajectorySpeeds = speeds;
      this.updateChevrons();
    }
  }

  /**
   * Update forward-motion directional chevrons along the selected trajectory.
   */
  public update(deltaSec: number): void {
    if (!this.reducedMotion && this.selectedTrajectoryDisplayPoints.length >= 2) {
      // Advance chevron phase based on time
      this.chevronPhase = (this.chevronPhase + deltaSec * 0.25) % 1.0;
      this.updateChevrons();
    }
  }

  private updateChevrons(): void {
    if (!this.chevronMesh) return;
    const pts = this.selectedTrajectoryDisplayPoints;
    if (pts.length < 2) {
      this.chevronMesh.visible = false;
      return;
    }

    this.chevronMesh.visible = true;
    const dummy = new THREE.Object3D();

    const totalSegs = pts.length - 1;
    const maxSpeed = this.selectedTrajectorySpeeds.length > 0
      ? Math.max(...this.selectedTrajectorySpeeds, 1.0)
      : 1.0;

    for (let k = 0; k < this.maxChevrons; k++) {
      // Parameter along path in [0, 1)
      const baseT = k / this.maxChevrons;
      const t = (baseT + (this.reducedMotion ? 0 : this.chevronPhase)) % 1.0;

      // Find segment
      const continuousIdx = t * totalSegs;
      const segIdx = Math.min(Math.floor(continuousIdx), totalSegs - 1);
      const frac = continuousIdx - segIdx;

      const p1 = pts[segIdx];
      const p2 = pts[segIdx + 1];

      // Position
      const pos = new THREE.Vector3().lerpVectors(p1, p2, frac);

      // Tangent vector
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();

      dummy.position.copy(pos);
      if (tangent.lengthSq() > 0.0001) {
        // Look along tangent
        const target = new THREE.Vector3().addVectors(pos, tangent);
        dummy.lookAt(target);
      }

      // Periapsis energy scaling: size and intensity proportional to local speed
      const localSpeed = this.selectedTrajectorySpeeds[segIdx] || 1.0;
      const speedRatio = Math.min(2.0, Math.max(0.7, (localSpeed / maxSpeed) * 1.5));

      // Slightly smaller towards future horizon
      const horizonScale = 1.0 - t * 0.4;
      const finalScale = speedRatio * horizonScale * 0.75;
      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();
      this.chevronMesh.setMatrixAt(k, dummy.matrix);
    }

    this.chevronMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update the sensitivity cloud (fan of perturbed trajectories).
   */
  public updateSensitivityCloud(fans: Vector3D[][]): void {
    if (!this.sensitivityLines) return;

    if (!fans || fans.length === 0) {
      this.sensitivityLines.visible = false;
      return;
    }

    this.sensitivityLines.visible = true;
    const geo = this.sensitivityLines.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colAttr = geo.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let segIndex = 0;
    const cloudColor = new THREE.Color('#49e7ff');

    for (let f = 0; f < fans.length; f++) {
      const path = fans[f];
      for (let p = 0; p < path.length - 1; p++) {
        if (segIndex >= this.maxSensitivitySegments) break;

        const p1 = this.scaleTransform.getDisplayPosition(path[p]);
        const p2 = this.scaleTransform.getDisplayPosition(path[p + 1]);

        const idx = segIndex * 6;
        posArr[idx] = p1.x;
        posArr[idx + 1] = p1.y;
        posArr[idx + 2] = p1.z;
        posArr[idx + 3] = p2.x;
        posArr[idx + 4] = p2.y;
        posArr[idx + 5] = p2.z;

        const progress = p / path.length;
        const fade = (1.0 - progress) * 0.4;

        colArr[idx] = cloudColor.r * fade;
        colArr[idx + 1] = cloudColor.g * fade;
        colArr[idx + 2] = cloudColor.b * fade;
        colArr[idx + 3] = cloudColor.r * (fade * 0.8);
        colArr[idx + 4] = cloudColor.g * (fade * 0.8);
        colArr[idx + 5] = cloudColor.b * (fade * 0.8);

        segIndex++;
      }
    }

    geo.setDrawRange(0, segIndex * 2);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public clearBody(bodyId: string): void {
    const entry = this.lineMap.get(bodyId);
    if (entry) {
      this.group.remove(entry.line);
      entry.geometry.dispose();
      entry.material.dispose();
      this.lineMap.delete(bodyId);
    }
  }

  public clearAll(): void {
    for (const [id] of this.lineMap) {
      this.clearBody(id);
    }
    if (this.sensitivityLines) {
      this.sensitivityLines.visible = false;
    }
    if (this.chevronMesh) {
      this.chevronMesh.visible = false;
    }
    this.selectedTrajectoryDisplayPoints = [];
    this.selectedTrajectorySpeeds = [];
  }

  public dispose(): void {
    this.clearAll();
    if (this.chevronMesh) {
      this.chevronGroup.remove(this.chevronMesh);
      this.chevronMesh.geometry.dispose();
      (this.chevronMesh.material as THREE.Material).dispose();
      this.chevronMesh = null;
    }
    if (this.sensitivityLines) {
      this.group.remove(this.sensitivityLines);
      this.sensitivityLines.geometry.dispose();
      (this.sensitivityLines.material as THREE.Material).dispose();
      this.sensitivityLines = null;
    }
  }
}
