/**
 * Network Sync Protocol & Delta Message Encoder.
 * Computes state deltas against a baseline snapshot, omitting stationary/unchanged
 * bodies to minimize sync payload size, and applies deltas to reconstruct state.
 */

import { CelestialBody } from '../simulation/types';

export interface BodyDelta {
  id: string;
  pos?: [number, number, number];
  vel?: [number, number, number];
  mass?: number;
}

export interface NetworkSyncDelta {
  tick: number;
  timestamp: number;
  updatedBodies: BodyDelta[];
  addedBodies?: CelestialBody[];
  removedBodyIds?: string[];
}

export class NetworkSyncProtocol {
  /**
   * Computes a minimal state delta between a baseline snapshot and current bodies.
   * Only bodies whose position or velocity changed beyond threshold are included.
   */
  public static computeDelta(
    baseline: CelestialBody[],
    current: CelestialBody[],
    tick: number,
    posEpsilon = 1e-4,
    velEpsilon = 1e-4
  ): NetworkSyncDelta {
    const baselineMap = new Map<string, CelestialBody>();
    for (const b of baseline) {
      baselineMap.set(b.id, b);
    }

    const updatedBodies: BodyDelta[] = [];
    const addedBodies: CelestialBody[] = [];

    for (const cur of current) {
      const base = baselineMap.get(cur.id);
      if (!base) {
        addedBodies.push(cur);
      } else {
        const dx = Math.abs(cur.position.x - base.position.x);
        const dy = Math.abs(cur.position.y - base.position.y);
        const dz = Math.abs(cur.position.z - base.position.z);
        const posChanged = dx > posEpsilon || dy > posEpsilon || dz > posEpsilon;

        const dvx = Math.abs(cur.velocity.x - base.velocity.x);
        const dvy = Math.abs(cur.velocity.y - base.velocity.y);
        const dvz = Math.abs(cur.velocity.z - base.velocity.z);
        const velChanged = dvx > velEpsilon || dvy > velEpsilon || dvz > velEpsilon;

        if (posChanged || velChanged) {
          const delta: BodyDelta = { id: cur.id };
          if (posChanged) delta.pos = [cur.position.x, cur.position.y, cur.position.z];
          if (velChanged) delta.vel = [cur.velocity.x, cur.velocity.y, cur.velocity.z];
          updatedBodies.push(delta);
        }
      }
    }

    const currentIds = new Set(current.map(b => b.id));
    const removedBodyIds = baseline
      .filter(b => !currentIds.has(b.id))
      .map(b => b.id);

    return {
      tick,
      timestamp: Date.now(),
      updatedBodies,
      addedBodies: addedBodies.length > 0 ? addedBodies : undefined,
      removedBodyIds: removedBodyIds.length > 0 ? removedBodyIds : undefined,
    };
  }

  /**
   * Applies a delta to a baseline state to reconstruct the updated celestial body array.
   */
  public static applyDelta(
    baseline: CelestialBody[],
    delta: NetworkSyncDelta
  ): CelestialBody[] {
    const bodyMap = new Map<string, CelestialBody>();
    for (const b of baseline) {
      bodyMap.set(b.id, {
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
      });
    }

    // 1. Remove deleted bodies
    if (delta.removedBodyIds) {
      for (const id of delta.removedBodyIds) {
        bodyMap.delete(id);
      }
    }

    // 2. Apply deltas
    for (const u of delta.updatedBodies) {
      const existing = bodyMap.get(u.id);
      if (existing) {
        if (u.pos) {
          existing.position = { x: u.pos[0], y: u.pos[1], z: u.pos[2] };
        }
        if (u.vel) {
          existing.velocity = { x: u.vel[0], y: u.vel[1], z: u.vel[2] };
        }
        if (u.mass !== undefined) {
          existing.mass = u.mass;
        }
      }
    }

    // 3. Add new bodies
    if (delta.addedBodies) {
      for (const added of delta.addedBodies) {
        bodyMap.set(added.id, added);
      }
    }

    return Array.from(bodyMap.values());
  }

  /**
   * Encodes delta payload into compact JSON string.
   */
  public static encodeDelta(delta: NetworkSyncDelta): string {
    return JSON.stringify(delta);
  }

  /**
   * Decodes delta payload from string.
   */
  public static decodeDelta(raw: string): NetworkSyncDelta | null {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.tick === 'number' && Array.isArray(parsed.updatedBodies)) {
        return parsed as NetworkSyncDelta;
      }
      return null;
    } catch {
      return null;
    }
  }
}
