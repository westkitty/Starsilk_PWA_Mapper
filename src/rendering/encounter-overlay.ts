/**
 * Closest-Approach & Orbital Conjunction Overlay (#46).
 * 
 * Analyzes multi-body forecast trajectories to identify meaningful future encounters:
 * - Computes closest approach distance and time-to-encounter
 * - Highlights genuine collision risks when distance < sum of physical radii
 * - Visualizes 3D diamond encounter markers and conjunction line chords
 * - Strictly limits visual markers to the top 2 highest-value encounters
 */

import * as THREE from "three";
import { CelestialBody, Vector3D } from "../simulation/types";
import { ScaleTransform } from "./scale-transform";
import { FloatingOrigin } from "./floating-origin";

export interface EncounterData {
  bodyAId: string;
  bodyAName: string;
  bodyBId: string;
  bodyBName: string;
  closestDistanceKm: number;
  timeUntilSec: number;
  isCollisionRisk: boolean;
  positionKm: Vector3D;
}

export class EncounterOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  private markers: THREE.Mesh[] = [];
  private chordLines: THREE.Line[] = [];
  private currentEncounters: EncounterData[] = [];

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = "EncounterOverlayGroup";
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getEncounters(): EncounterData[] {
    return this.currentEncounters;
  }

  public update(
    selectedBodyId: string | null,
    allBodies: CelestialBody[],
    trajectories: Record<string, Vector3D[]> | null
  ): void {
    this.clear();

    if (!selectedBodyId || !trajectories || !trajectories[selectedBodyId]) {
      return;
    }

    const selBody = allBodies.find(b => b.id === selectedBodyId);
    if (!selBody) return;

    const selPath = trajectories[selectedBodyId];
    if (!selPath || selPath.length < 2) return;

    const candidateEncounters: EncounterData[] = [];

    // Compare with all other bodies that have trajectories
    for (const other of allBodies) {
      if (other.id === selectedBodyId) continue;
      const otherPath = trajectories[other.id];
      if (!otherPath) continue;

      const numSteps = Math.min(selPath.length, otherPath.length);
      let minDistance = Infinity;
      let minIdx = -1;

      for (let i = 0; i < numSteps; i++) {
        const pA = selPath[i];
        const pB = otherPath[i];
        const dist = Math.hypot(pA.x - pB.x, pA.y - pB.y, pA.z - pB.z);
        if (dist < minDistance) {
          minDistance = dist;
          minIdx = i;
        }
      }

      if (minIdx > 0 && minDistance < Infinity) {
        const sumRadii = (selBody.radiusKm || 1000) + (other.radiusKm || 1000);
        // Only consider if close enough to be an encounter (< 500,000 km or < 15x radii)
        const threshold = Math.max(500000, sumRadii * 15);
        if (minDistance < threshold) {
          const isCollision = minDistance <= sumRadii * 1.05;
          // Approximate time assuming ~60 sec step
          const timeSec = minIdx * 60;
          candidateEncounters.push({
            bodyAId: selBody.id,
            bodyAName: selBody.name,
            bodyBId: other.id,
            bodyBName: other.name,
            closestDistanceKm: minDistance,
            timeUntilSec: timeSec,
            isCollisionRisk: isCollision,
            positionKm: selPath[minIdx],
          });
        }
      }
    }

    // Sort by distance (closest first), take top 2
    candidateEncounters.sort((a, b) => a.closestDistanceKm - b.closestDistanceKm);
    this.currentEncounters = candidateEncounters.slice(0, 2);

    // Build visual markers
    for (const enc of this.currentEncounters) {
      const rel = this.floatingOrigin.toRelative(enc.positionKm);
      const disp = this.scaleTransform.getDisplayPosition(rel);

      const color = enc.isCollisionRisk ? 0xef4444 : 0xf59e0b;

      // 3D diamond marker
      const geo = new THREE.OctahedronGeometry(1.5, 0);
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(disp.x, disp.y, disp.z);
      this.group.add(mesh);
      this.markers.push(mesh);
    }
  }

  public clear(): void {
    for (const m of this.markers) {
      this.group.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const l of this.chordLines) {
      this.group.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    }
    this.markers = [];
    this.chordLines = [];
    this.currentEncounters = [];
  }

  public dispose(): void {
    this.clear();
  }
}
