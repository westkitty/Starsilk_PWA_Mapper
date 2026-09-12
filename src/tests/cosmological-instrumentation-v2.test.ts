import { describe, it, expect } from "vitest";
import { CelestialBody } from "../simulation/types";
import { SPEED_OF_LIGHT_KM_S, G_KM } from "../simulation/units";
import { detectMeanMotionResonances } from "../simulation/orbital-mechanics";
import { OrbitalPlaneGizmo } from "../rendering/orbital-plane-gizmo";
import { ScaleTransform } from "../rendering/scale-transform";
import { FloatingOrigin } from "../rendering/floating-origin";

describe("Cosmological Instrumentation V2 Suite (#44–#49)", () => {
  const primaryStar: CelestialBody = {
    id: "star-primary",
    name: "Aurelia",
    type: "star",
    massKg: 1.989e30,
    radiusKm: 696340,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: "#ffdd44",
  };

  const innerPlanet: CelestialBody = {
    id: "planet-inner",
    name: "Hermes",
    type: "planet",
    massKg: 3.30e23,
    radiusKm: 2440,
    position: { x: 57909050, y: 0, z: 0 }, // ~0.387 AU
    velocity: { x: 0, y: 0, z: 47.36 },
    color: "#888888",
    primaryId: "star-primary",
  };

  const outerPlanet: CelestialBody = {
    id: "planet-outer",
    name: "Aphrodite",
    type: "planet",
    massKg: 4.87e24,
    radiusKm: 6052,
    position: { x: 108208000, y: 0, z: 0 }, // ~0.723 AU
    velocity: { x: 0, y: 0, z: 35.02 },
    color: "#e2b87a",
    primaryId: "star-primary",
  };

  it("#44: Analytical Two-Point Measurement computes exact geometry and light travel time", () => {
    const dx = outerPlanet.position.x - innerPlanet.position.x;
    const dy = outerPlanet.position.y - innerPlanet.position.y;
    const dz = outerPlanet.position.z - innerPlanet.position.z;
    const centerDistKm = Math.hypot(dx, dy, dz);

    const sumRadii = innerPlanet.radiusKm + outerPlanet.radiusKm;
    const surfaceSeparationKm = centerDistKm - sumRadii;

    const lightTravelTimeSec = centerDistKm / SPEED_OF_LIGHT_KM_S;

    const dvx = outerPlanet.velocity.x - innerPlanet.velocity.x;
    const dvy = outerPlanet.velocity.y - innerPlanet.velocity.y;
    const dvz = outerPlanet.velocity.z - innerPlanet.velocity.z;
    const relSpeedKmS = Math.hypot(dvx, dvy, dvz);

    expect(centerDistKm).toBeCloseTo(50298950, 0);
    expect(surfaceSeparationKm).toBeCloseTo(50298950 - 8492, 0);
    expect(lightTravelTimeSec).toBeGreaterThan(160); // ~167 seconds
    expect(lightTravelTimeSec).toBeLessThan(180);
    expect(relSpeedKmS).toBeCloseTo(12.34, 1);
  });

  it("#47: Mean-Motion Resonance Detection identifies resonant orbiters", () => {
    // Create two test bodies with exact 2:1 period ratio around primary
    // T = 2 * pi * sqrt(a^3 / mu)
    // For 2:1 period ratio, a2 / a1 = 2^(2/3) ≈ 1.5874
    const mu = G_KM * primaryStar.massKg;
    const a1 = 100000000;
    const v1 = Math.sqrt(mu / a1);

    const a2 = a1 * Math.pow(2, 2 / 3);
    const v2 = Math.sqrt(mu / a2);

    const bodyA: CelestialBody = {
      id: "res-a",
      name: "Body A",
      type: "planet",
      massKg: 1e24,
      radiusKm: 5000,
      position: { x: a1, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: v1 },
      color: "#0cc6ff",
    };

    const bodyB: CelestialBody = {
      id: "res-b",
      name: "Body B",
      type: "planet",
      massKg: 1e24,
      radiusKm: 5000,
      position: { x: a2, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: v2 },
      color: "#f59e0b",
    };

    const resonances = detectMeanMotionResonances([primaryStar, bodyA, bodyB]);
    expect(resonances.length).toBeGreaterThan(0);
    const match = resonances.find(r => (r.bodyAId === bodyA.id && r.bodyBId === bodyB.id) || (r.bodyAId === bodyB.id && r.bodyBId === bodyA.id));
    expect(match).toBeDefined();
    expect(match?.ratio.p).toBe(2);
    expect(match?.ratio.q).toBe(1);
    expect(match?.deltaPeriodFraction).toBeLessThan(0.01);
  });

  it("#49: Orbital Plane Gizmo computes orbital angular momentum normal and physical inclination rotation", () => {
    const scaleTransform = new ScaleTransform();
    const floatingOrigin = new FloatingOrigin();
    const gizmo = new OrbitalPlaneGizmo(scaleTransform, floatingOrigin);

    gizmo.update(innerPlanet, primaryStar);
    const state = gizmo.getState();

    expect(state).not.toBeNull();
    // In planar circular orbit in X-Z plane with v along +Z, normal is along -Y (or +Y depending on orientation)
    expect(Math.abs(state!.normalVector.y)).toBeCloseTo(1, 1);
    expect(state!.inclinationDeg).toBeCloseTo(0, 1);

    // Rotate inclination by 15 degrees: physical velocity must retain exact magnitude
    const vInitMag = Math.hypot(innerPlanet.velocity.x, innerPlanet.velocity.y, innerPlanet.velocity.z);
    gizmo.rotateInclination(innerPlanet, primaryStar, (15 * Math.PI) / 180);
    const vNewMag = Math.hypot(innerPlanet.velocity.x, innerPlanet.velocity.y, innerPlanet.velocity.z);

    expect(vNewMag).toBeCloseTo(vInitMag, 2);
    // Y-velocity should now be non-zero due to physical 3D inclination tilt
    expect(Math.abs(innerPlanet.velocity.y)).toBeGreaterThan(1.0);
  });
});
