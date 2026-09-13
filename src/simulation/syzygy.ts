/**
 * GAME05: Syzygy & Eclipse Alignment Engine.
 * Detects 3-body colinear alignments (eclipses, transits, planetary conjunctions).
 */

import { CelestialBody } from "./types";

export interface SyzygyEvent {
  starId: string;
  primaryBodyId: string;
  secondaryBodyId: string;
  alignmentAngleDeg: number;
  type: "solar_eclipse" | "lunar_eclipse" | "transit" | "conjunction";
}

export function detectSyzygyEvents(
  star: CelestialBody,
  bodies: CelestialBody[],
  maxAlignmentDeg: number = 2.5
): SyzygyEvent[] {
  const events: SyzygyEvent[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];
      if (b1.id === star.id || b2.id === star.id) continue;

      // Vectors from star to bodies
      const v1 = { x: b1.position.x - star.position.x, y: b1.position.y - star.position.y, z: b1.position.z - star.position.z };
      const v2 = { x: b2.position.x - star.position.x, y: b2.position.y - star.position.y, z: b2.position.z - star.position.z };
      const d1 = Math.hypot(v1.x, v1.y, v1.z);
      const d2 = Math.hypot(v2.x, v2.y, v2.z);
      if (d1 === 0 || d2 === 0) continue;

      const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (d1 * d2);
      const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;

      if (angleDeg <= maxAlignmentDeg) {
        const nearer = d1 < d2 ? b1 : b2;
        const farther = d1 < d2 ? b2 : b1;
        const type: SyzygyEvent["type"] = nearer.type === "planet" && farther.type === "moon" ? "solar_eclipse" : "transit";

        events.push({
          starId: star.id,
          primaryBodyId: nearer.id,
          secondaryBodyId: farther.id,
          alignmentAngleDeg: Number(angleDeg.toFixed(3)),
          type,
        });
      }
    }
  }

  return events;
}
