/**
 * GAME13: Planetary Collision Merger & Ejecta Simulation.
 * Computes inelastic mass merging and creates debris fragment swarms.
 */

import { CelestialBody, Vector3D } from "./types";
import { SeededRNG } from "../core/seeded-rng";

export function generateCollisionEjecta(
  pos: Vector3D,
  relVelocity: Vector3D,
  fragmentCount: number = 6,
  seed: number = 101
): CelestialBody[] {
  const rng = new SeededRNG(seed);
  const fragments: CelestialBody[] = [];
  const baseSpeed = Math.hypot(relVelocity.x, relVelocity.y, relVelocity.z) * 0.4;

  for (let i = 0; i < fragmentCount; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const zOffset = (rng.next() - 0.5) * 0.5;
    const speed = baseSpeed * rng.range(0.6, 1.4);

    fragments.push({
      id: `fragment-${Date.now()}-${i}`,
      name: `Collision Fragment ${i + 1}`,
      type: "planet",
      massKg: 1e19 * rng.range(0.1, 1.0),
      radiusKm: 80 * rng.range(0.5, 1.5),
      position: {
        x: pos.x + (rng.next() - 0.5) * 5000,
        y: pos.y + (rng.next() - 0.5) * 5000,
        z: pos.z + (rng.next() - 0.5) * 5000,
      },
      velocity: {
        x: Math.cos(angle) * speed,
        y: zOffset * speed,
        z: Math.sin(angle) * speed,
      },
      color: "#8c7b75",
      classification: "remnant",
    });
  }

  return fragments;
}
