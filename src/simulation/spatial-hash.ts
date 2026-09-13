/**
 * BACK05: Spatial Hash Grid Broadphase Collision Detection.
 * Fast O(N log N) spatial partitioning replacing O(N^2) all-pairs checks.
 */

import { CelestialBody, Vector3D } from "./types";

export class SpatialHashGrid {
  private cellSizeKm: number;
  private grid: Map<string, CelestialBody[]> = new Map();

  constructor(cellSizeKm: number = 100000) {
    this.cellSizeKm = cellSizeKm;
  }

  private hashKey(v: Vector3D): string {
    const x = Math.floor(v.x / this.cellSizeKm);
    const y = Math.floor(v.y / this.cellSizeKm);
    const z = Math.floor(v.z / this.cellSizeKm);
    return `${x}:${y}:${z}`;
  }

  clear(): void {
    this.grid.clear();
  }

  insertBodies(bodies: CelestialBody[]): void {
    this.clear();
    for (const body of bodies) {
      const key = this.hashKey(body.position);
      let list = this.grid.get(key);
      if (!list) {
        list = [];
        this.grid.set(key, list);
      }
      list.push(body);
    }
  }

  /**
   * Find candidate collision pairs within adjacent cells.
   */
  findCandidatePairs(bodies: CelestialBody[]): [CelestialBody, CelestialBody][] {
    this.insertBodies(bodies);
    const candidates: [CelestialBody, CelestialBody][] = [];
    const checked = new Set<string>();

    for (const body of bodies) {
      const gx = Math.floor(body.position.x / this.cellSizeKm);
      const gy = Math.floor(body.position.y / this.cellSizeKm);
      const gz = Math.floor(body.position.z / this.cellSizeKm);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${gx + dx}:${gy + dy}:${gz + dz}`;
            const neighbors = this.grid.get(key);
            if (!neighbors) continue;

            for (const other of neighbors) {
              if (body.id >= other.id) continue; // Avoid self and duplicates
              const pairKey = `${body.id}:${other.id}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              candidates.push([body, other]);
            }
          }
        }
      }
    }

    return candidates;
  }
}
