/**
 * Bounding Volume Hierarchy (BVH) Spatial Accelerator.
 * Accelerates close-encounter and contact queries for multi-body systems.
 */

import { Box3, Vector3 } from 'three';

export interface BVHEntity {
  id: string;
  box: Box3;
}

export class BVHNode {
  public box: Box3 = new Box3();
  public left: BVHNode | null = null;
  public right: BVHNode | null = null;
  public entities: BVHEntity[] = [];

  constructor(entities: BVHEntity[], maxLeaf = 4) {
    if (entities.length <= maxLeaf) {
      this.entities = entities;
      for (const e of entities) {
        this.box.union(e.box);
      }
    } else {
      // Find bounding box enclosing all
      for (const e of entities) {
        this.box.union(e.box);
      }
      const size = new Vector3();
      this.box.getSize(size);

      // Split along longest axis
      let axis: 'x' | 'y' | 'z' = 'x';
      if (size.y > size.x && size.y > size.z) axis = 'y';
      else if (size.z > size.x && size.z > size.y) axis = 'z';

      const center = new Vector3();
      this.box.getCenter(center);
      const mid = center[axis];

      const leftEntities: BVHEntity[] = [];
      const rightEntities: BVHEntity[] = [];

      for (const e of entities) {
        const c = new Vector3();
        e.box.getCenter(c);
        if (c[axis] < mid) leftEntities.push(e);
        else rightEntities.push(e);
      }

      // Handle degenerate split
      if (leftEntities.length === 0 || rightEntities.length === 0) {
        const half = Math.floor(entities.length / 2);
        this.left = new BVHNode(entities.slice(0, half), maxLeaf);
        this.right = new BVHNode(entities.slice(half), maxLeaf);
      } else {
        this.left = new BVHNode(leftEntities, maxLeaf);
        this.right = new BVHNode(rightEntities, maxLeaf);
      }
    }
  }

  public queryIntersections(queryBox: Box3, results: string[] = []): string[] {
    if (!this.box.intersectsBox(queryBox)) return results;

    for (const e of this.entities) {
      if (e.box.intersectsBox(queryBox)) {
        results.push(e.id);
      }
    }

    if (this.left) this.left.queryIntersections(queryBox, results);
    if (this.right) this.right.queryIntersections(queryBox, results);

    return results;
  }
}
