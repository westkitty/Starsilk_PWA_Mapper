/**
 * Simulation State Diff & Patch Engine.
 * Computes minimal differential patches between celestial system states.
 */

import { CelestialBody } from '../simulation/types';

export interface BodyDelta {
  id: string;
  type: 'added' | 'removed' | 'modified';
  changes?: Partial<CelestialBody>;
}

export interface SystemDiff {
  timestamp: number;
  addedBodyIds: string[];
  removedBodyIds: string[];
  modifiedBodies: BodyDelta[];
}

export function computeSystemDiff(
  previousBodies: CelestialBody[],
  currentBodies: CelestialBody[]
): SystemDiff {
  const prevMap = new Map(previousBodies.map(b => [b.id, b]));
  const currMap = new Map(currentBodies.map(b => [b.id, b]));

  const addedBodyIds: string[] = [];
  const removedBodyIds: string[] = [];
  const modifiedBodies: BodyDelta[] = [];

  for (const [id] of currMap) {
    if (!prevMap.has(id)) {
      addedBodyIds.push(id);
    }
  }

  for (const [id] of prevMap) {
    if (!currMap.has(id)) {
      removedBodyIds.push(id);
    }
  }

  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id);
    if (!prev) continue;

    const changes: Partial<CelestialBody> = {};
    let hasChanged = false;

    if (prev.name !== curr.name) {
      changes.name = curr.name;
      hasChanged = true;
    }
    if (prev.massKg !== curr.massKg) {
      changes.massKg = curr.massKg;
      hasChanged = true;
    }
    if (prev.color !== curr.color) {
      changes.color = curr.color;
      hasChanged = true;
    }
    if (
      prev.position.x !== curr.position.x ||
      prev.position.y !== curr.position.y ||
      prev.position.z !== curr.position.z
    ) {
      changes.position = { ...curr.position };
      hasChanged = true;
    }
    if (
      prev.velocity.x !== curr.velocity.x ||
      prev.velocity.y !== curr.velocity.y ||
      prev.velocity.z !== curr.velocity.z
    ) {
      changes.velocity = { ...curr.velocity };
      hasChanged = true;
    }

    if (hasChanged) {
      modifiedBodies.push({ id, type: 'modified', changes });
    }
  }

  return {
    timestamp: Date.now(),
    addedBodyIds,
    removedBodyIds,
    modifiedBodies,
  };
}
