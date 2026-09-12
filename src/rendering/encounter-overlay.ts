/**
 * Closest-Approach & Orbital Conjunction Overlay (#46).
 *
 * Forecast analysis is recomputed only when meaningful forecast samples change.
 * Stable frames reuse marker geometry/materials and only refresh display positions,
 * avoiding per-frame GPU resource churn while preserving floating-origin updates.
 */

import * as THREE from 'three';
import { CelestialBody, Vector3D } from '../simulation/types';
import { ScaleTransform } from './scale-transform';
import { FloatingOrigin } from './floating-origin';

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

interface PathFingerprint {
  length: number;
  first: Vector3D | undefined;
  middle: Vector3D | undefined;
  last: Vector3D | undefined;
}

export class EncounterOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  private markers: THREE.Mesh[] = [];
  private currentEncounters: EncounterData[] = [];
  private lastSelectedBodyId: string | null = null;
  private pathFingerprints = new Map<string, PathFingerprint>();

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;
    this.group = new THREE.Group();
    this.group.name = 'EncounterOverlayGroup';
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
    if (!this.haveForecastSamplesChanged(selectedBodyId, trajectories)) {
      this.updateMarkerPositions();
      return;
    }

    this.captureForecastFingerprint(selectedBodyId, trajectories);
    this.rebuildAnalysis(selectedBodyId, allBodies, trajectories);
  }

  private haveForecastSamplesChanged(
    selectedBodyId: string | null,
    trajectories: Record<string, Vector3D[]> | null
  ): boolean {
    if (selectedBodyId !== this.lastSelectedBodyId) return true;
    if (!trajectories) return this.pathFingerprints.size > 0;

    const ids = Object.keys(trajectories);
    if (ids.length !== this.pathFingerprints.size) return true;

    for (const id of ids) {
      const path = trajectories[id];
      const previous = this.pathFingerprints.get(id);
      if (!previous || previous.length !== path.length) return true;
      const middle = path.length > 0 ? path[Math.floor(path.length / 2)] : undefined;
      if (previous.first !== path[0] || previous.middle !== middle || previous.last !== path[path.length - 1]) {
        return true;
      }
    }

    return false;
  }

  private captureForecastFingerprint(
    selectedBodyId: string | null,
    trajectories: Record<string, Vector3D[]> | null
  ): void {
    this.lastSelectedBodyId = selectedBodyId;
    this.pathFingerprints.clear();
    if (!trajectories) return;

    for (const [id, path] of Object.entries(trajectories)) {
      this.pathFingerprints.set(id, {
        length: path.length,
        first: path[0],
        middle: path.length > 0 ? path[Math.floor(path.length / 2)] : undefined,
        last: path[path.length - 1],
      });
    }
  }

  private rebuildAnalysis(
    selectedBodyId: string | null,
    allBodies: CelestialBody[],
    trajectories: Record<string, Vector3D[]> | null
  ): void {
    this.disposeMarkers();
    this.currentEncounters = [];

    if (!selectedBodyId || !trajectories || !trajectories[selectedBodyId]) return;

    const selBody = allBodies.find(b => b.id === selectedBodyId);
    if (!selBody) return;

    const selPath = trajectories[selectedBodyId];
    if (!selPath || selPath.length < 2) return;

    const candidateEncounters: EncounterData[] = [];

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

      if (minIdx <= 0 || minDistance === Infinity) continue;

      const sumRadii = (selBody.radiusKm || 1000) + (other.radiusKm || 1000);
      const threshold = Math.max(500000, sumRadii * 15);
      if (minDistance >= threshold) continue;

      candidateEncounters.push({
        bodyAId: selBody.id,
        bodyAName: selBody.name,
        bodyBId: other.id,
        bodyBName: other.name,
        closestDistanceKm: minDistance,
        timeUntilSec: minIdx * 60,
        isCollisionRisk: minDistance <= sumRadii * 1.05,
        positionKm: selPath[minIdx],
      });
    }

    candidateEncounters.sort((a, b) => a.closestDistanceKm - b.closestDistanceKm);
    this.currentEncounters = candidateEncounters.slice(0, 2);

    for (const encounter of this.currentEncounters) {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.5, 0),
        new THREE.MeshBasicMaterial({
          color: encounter.isCollisionRisk ? 0xef4444 : 0xf59e0b,
          wireframe: true,
        })
      );
      this.group.add(marker);
      this.markers.push(marker);
    }

    this.updateMarkerPositions();
  }

  private updateMarkerPositions(): void {
    const count = Math.min(this.markers.length, this.currentEncounters.length);
    for (let i = 0; i < count; i++) {
      const encounter = this.currentEncounters[i];
      const rel = this.floatingOrigin.toRelative(encounter.positionKm);
      const disp = this.scaleTransform.getDisplayPosition(rel);
      this.markers[i].position.set(disp.x, disp.y, disp.z);
    }
  }

  private disposeMarkers(): void {
    for (const marker of this.markers) {
      this.group.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    }
    this.markers = [];
  }

  public clear(): void {
    this.disposeMarkers();
    this.currentEncounters = [];
    this.lastSelectedBodyId = null;
    this.pathFingerprints.clear();
  }

  public dispose(): void {
    this.clear();
  }
}
