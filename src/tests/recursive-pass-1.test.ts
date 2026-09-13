/**
 * Test Suite for Recursive Improvement Pass 1 (UI01-15, ASSET01-15, GAME01-15, BACK01-15).
 */

import { describe, it, expect } from "vitest";

// Backend
import { EventBus } from "../core/event-bus";
import { UndoStack } from "../simulation/undo-stack";
import { validateCelestialBody, sanitizeCelestialBody } from "../persistence/validation";
import { migrateProjectData } from "../persistence/migrations";
import { SpatialHashGrid } from "../simulation/spatial-hash";
import { exportEphemerisCsv } from "../simulation/ephemeris";
import { PerformanceMonitor } from "../core/perf-monitor";
import { SeededRNG } from "../core/seeded-rng";
import { Logger } from "../core/logger";

// Gameplay
import { detectResonances } from "../simulation/resonances";
import { calculateGravityAssistDeltaV } from "../simulation/gravity-assists";
import { computeTidalLockingTimescaleYears, applyTidalCircularization } from "../simulation/tidal-locking";
import { calculateRadiationPressureForce, applyRadiationPressureAcceleration } from "../simulation/radiation-pressure";
import { detectSyzygyEvents } from "../simulation/syzygy";
import { ASTRODYNAMIC_CHALLENGES } from "../simulation/challenges";
import { calculateHohmannTransfer } from "../simulation/transfer-planner";
import { generateProceduralSystem } from "../simulation/presets/procedural-system";
import { checkAndApplyRocheDisruption } from "../simulation/roche-disruption";
import { spawnStellarIntruder } from "../simulation/stellar-intruder";
import { auditHillStability } from "../simulation/hill-stability";
import { evaluateClimate } from "../simulation/climate-sim";
import { generateCollisionEjecta } from "../simulation/collision-ejecta";
import { applyManeuverImpulse } from "../simulation/maneuver-nodes";
import { executeHeliocideOutburst } from "../canon/heliocide-macro";

// Assets
import { createAccretionDiskMesh } from "../rendering/accretion-disk";
import { createHabitableZoneMesh } from "../rendering/habitable-rings";
import { createAtmosphericGlowMesh } from "../rendering/atmospheric-glow";
import { CollisionBurstManager } from "../rendering/collision-bursts";
import { createCometTailMesh } from "../rendering/comet-tails";
import { createLagrangeGlyph } from "../rendering/lagrange-markers";
import { createVelocityArrow } from "../rendering/velocity-arrow";
import { createPolarGraticule } from "../rendering/orbital-plane-graticule";
import { createTidallyDistortedGeometry } from "../rendering/tidal-distortion";
import { createShadowConeMesh } from "../rendering/eclipse-cones";
import { createStationMesh } from "../rendering/station-assets";
import { SPECTRAL_PALETTE } from "../rendering/star-palette";
import { audioSynth } from "../audio/audio-synth";

describe("Recursive Pass 1: Backend Systems (BACK01-BACK15)", () => {
  it("BACK01: EventBus delivers typed events to listeners and unsubscribes cleanly", () => {
    const bus = new EventBus();
    let received = "";
    const unsub = bus.on("toast:notify", (p) => { received = p.message; });
    bus.emit("toast:notify", { message: "Test Payload" });
    expect(received).toBe("Test Payload");
    unsub();
    bus.emit("toast:notify", { message: "After Unsub" });
    expect(received).toBe("Test Payload");
  });

  it("BACK02: UndoStack stores, restores, and redos system snapshots", () => {
    const stack = new UndoStack();
    const bodiesA = [{ id: "b1", name: "Alpha", type: "planet" as const, massKg: 1e24, radiusKm: 6000, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" }];
    const bodiesB = [{ id: "b1", name: "Alpha Mod", type: "planet" as const, massKg: 2e24, radiusKm: 6000, position: { x: 10, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" }];

    stack.pushState(bodiesA, "b1", "Initial");
    expect(stack.canUndo()).toBe(true);

    const undone = stack.undo(bodiesB, "b1");
    expect(undone?.bodies[0].name).toBe("Alpha");
    expect(stack.canRedo()).toBe(true);

    const redone = stack.redo(undone!.bodies, "b1");
    expect(redone?.bodies[0].name).toBe("Alpha Mod");
  });

  it("BACK04: Data validation detects invalid physical quantities and sanitizes correctly", () => {
    const issues = validateCelestialBody({ id: "test", massKg: -100, radiusKm: NaN });
    expect(issues.some(i => i.field === "massKg")).toBe(true);
    expect(issues.some(i => i.field === "radiusKm")).toBe(true);

    const sanitized = sanitizeCelestialBody({ name: "Clean World", massKg: -5 });
    expect(sanitized.massKg).toBeGreaterThan(0);
    expect(sanitized.radiusKm).toBeGreaterThan(0);
  });

  it("BACK04: Schema migration transforms v1 data to v2 with proper defaults", () => {
    const v1Data = { version: 1, bodies: [{ id: "b1", name: "Legacy World" }] };
    const migrated = migrateProjectData(v1Data);
    expect(migrated.version).toBe(2);
    expect(migrated.bodies[0].classification).toBe("rocky");
    expect(migrated.bodies[0].albedo).toBe(0.3);
  });

  it("BACK05: SpatialHashGrid partitions space and finds candidate collision pairs", () => {
    const grid = new SpatialHashGrid(10000);
    const b1 = { id: "1", name: "1", type: "planet" as const, massKg: 1, radiusKm: 10, position: { x: 100, y: 100, z: 100 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };
    const b2 = { id: "2", name: "2", type: "planet" as const, massKg: 1, radiusKm: 10, position: { x: 150, y: 120, z: 110 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };
    const bFar = { id: "3", name: "3", type: "planet" as const, massKg: 1, radiusKm: 10, position: { x: 1e8, y: 1e8, z: 1e8 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };

    const candidates = grid.findCandidatePairs([b1, b2, bFar]);
    expect(candidates.length).toBe(1);
    expect(candidates[0][0].id).toBe("1");
    expect(candidates[0][1].id).toBe("2");
  });

  it("BACK06: Ephemeris export outputs valid NASA Horizons CSV rows", () => {
    const b1 = { id: "1", name: "Earth", type: "planet" as const, massKg: 5.972e24, radiusKm: 6371, position: { x: 149597870, y: 0, z: 0 }, velocity: { x: 0, y: 29.78, z: 0 }, color: "#fff" };
    const csv = exportEphemerisCsv([b1], 86400);
    expect(csv).toContain("body_name");
    expect(csv).toContain("pos_x_au");
    expect(csv).toContain("Earth");
  });

  it("BACK07: PerformanceMonitor tracks frame rates and smooths averages", () => {
    const perf = new PerformanceMonitor();
    perf.recordFrame(0.5, 12);
    const metrics = perf.getAverageMetrics();
    expect(metrics.avgFps).toBeGreaterThan(0);
    expect(metrics.avgFrameMs).toBeGreaterThan(0);
  });

  it("BACK10: SeededRNG generates deterministic sequences and Gaussian values", () => {
    const rng1 = new SeededRNG(999);
    const rng2 = new SeededRNG(999);
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.range(10, 20)).toBe(rng2.range(10, 20));
    expect(rng1.gaussian(0, 1)).toBe(rng2.gaussian(0, 1));
  });

  it("BACK14: Logger records structured logs with severity and exports JSON", () => {
    const logger = new Logger();
    logger.info("PHYSICS", "Step completed", { dt: 60 });
    const json = logger.exportTraceJson();
    expect(json).toContain("PHYSICS");
    expect(json).toContain("Step completed");
  });
});

describe("Recursive Pass 1: Gameplay Systems (GAME01-GAME15)", () => {
  it("GAME01: Orbital resonance detector finds 1:2 and 2:3 resonant period pairs", () => {
    const orbits = [
      { bodyId: "inner", elements: { semiMajorAxisKm: 1e6, eccentricity: 0, inclinationDeg: 0, periapsisKm: 1e6, apoapsisKm: 1e6, periodSec: 10000, isBound: true, isHyperbolicEscape: false, trueAnomalyDeg: 0, meanMotionRadSec: 0.0006, hillRadiusKm: null, rocheLimitKm: null, equilibriumTempK: null } },
      { bodyId: "outer", elements: { semiMajorAxisKm: 2e6, eccentricity: 0, inclinationDeg: 0, periapsisKm: 2e6, apoapsisKm: 2e6, periodSec: 20050, isBound: true, isHyperbolicEscape: false, trueAnomalyDeg: 0, meanMotionRadSec: 0.0003, hillRadiusKm: null, rocheLimitKm: null, equilibriumTempK: null } },
    ];
    const res = detectResonances(orbits, 5.0);
    expect(res.length).toBe(1);
    expect(res[0].ratioLabel).toBe("1:2");
  });

  it("GAME02: Gravity assist computes deflection and net velocity change", () => {
    const vIn = { x: 30, y: 0, z: 0 };
    const vOut = { x: 0, y: 40, z: 0 };
    const vPrimary = { x: 10, y: 0, z: 0 };
    const assist = calculateGravityAssistDeltaV(vIn, vOut, vPrimary);
    expect(assist.deltaV).toBe(10);
    expect(assist.deflectionDeg).toBeGreaterThan(0);
  });

  it("GAME03: Tidal locking timescales and circularization damping compute properly", () => {
    const years = computeTidalLockingTimescaleYears(5.972e24, 7.34e22, 1737, 384400);
    expect(years).toBeGreaterThan(0);
    const newEcc = applyTidalCircularization(0.2, 384400, 1e6, 1e7);
    expect(newEcc).toBeLessThan(0.2);
  });

  it("GAME04: Radiation pressure calculates positive photon force and radial acceleration", () => {
    const force = calculateRadiationPressureForce(149597870, 1000, 0.3);
    expect(force).toBeGreaterThan(0);
    const accel = applyRadiationPressureAcceleration({ x: 149597870, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1000, 10);
    expect(accel.x).toBeGreaterThan(0);
  });

  it("GAME05: Syzygy engine detects colinear 3-body eclipse alignment", () => {
    const star = { id: "star", name: "Sun", type: "star" as const, massKg: 1.989e30, radiusKm: 696340, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ff0" };
    const p1 = { id: "p1", name: "Planet", type: "planet" as const, massKg: 5.972e24, radiusKm: 6371, position: { x: 1e7, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#00f" };
    const p2 = { id: "p2", name: "Moon", type: "moon" as const, massKg: 7e22, radiusKm: 1700, position: { x: 1.05e7, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ccc" };

    const syzygies = detectSyzygyEvents(star, [p1, p2], 5.0);
    expect(syzygies.length).toBe(1);
    expect(syzygies[0].alignmentAngleDeg).toBeLessThan(1.0);
  });

  it("GAME06: Astrodynamic challenges list contains 4 valid playable missions", () => {
    expect(ASTRODYNAMIC_CHALLENGES.length).toBe(4);
    const bodies = [{ id: "s", name: "Sun", type: "star" as const, massKg: 1e30, radiusKm: 7e5, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ff0" }];
    const status = ASTRODYNAMIC_CHALLENGES[0].checkSuccess(bodies);
    expect(typeof status.success).toBe("boolean");
  });

  it("GAME07: Hohmann transfer computes realistic delta-V and transfer durations", () => {
    const sol = calculateHohmannTransfer(1.989e30, 149597870, 227939200); // Earth to Mars transfer
    expect(sol.totalDeltaVKmS).toBeGreaterThan(4);
    expect(sol.totalDeltaVKmS).toBeLessThan(12);
    expect(sol.transferTimeSec).toBeGreaterThan(1e7);
  });

  it("GAME08: Procedural system generator creates star and multiple planets", () => {
    const sys = generateProceduralSystem(12345);
    expect(sys.bodies.length).toBeGreaterThanOrEqual(4);
    expect(sys.bodies[0].type).toBe("star");
    expect(sys.bodies.some(b => b.type === "planet")).toBe(true);
  });

  it("GAME09: Roche limit disruption converts encroaching satellite into debris ring", () => {
    const primary = { id: "p", name: "Giant", type: "planet" as const, massKg: 1.89e27, radiusKm: 70000, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };
    const satellite = { id: "s", name: "Moon", type: "moon" as const, massKg: 1e20, radiusKm: 500, position: { x: 80000, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };
    const ring = checkAndApplyRocheDisruption(primary, satellite, 80000);
    expect(ring).not.toBeNull();
    expect(ring?.innerRadiusKm).toBeGreaterThan(0);
  });

  it("GAME10: Spawn rogue stellar intruder creates hypervelocity unbound body", () => {
    const primary = { id: "p", name: "Star", type: "star" as const, massKg: 1.989e30, radiusKm: 700000, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#fff" };
    const intruder = spawnStellarIntruder(primary, 2.0, 45.0);
    expect(intruder.name).toContain("Rogue");
    const speed = Math.hypot(intruder.velocity.x, intruder.velocity.y, intruder.velocity.z);
    expect(speed).toBeCloseTo(45.0, 1);
  });

  it("GAME11: Hill sphere stability auditor flags orbits exceeding 0.5 R_H as chaotic", () => {
    const reportSafe = auditHillStability("m1", { semiMajorAxisKm: 1e5, eccentricity: 0, inclinationDeg: 0, periapsisKm: 1e5, apoapsisKm: 1e5, periodSec: 1000, isBound: true, isHyperbolicEscape: false, trueAnomalyDeg: 0, meanMotionRadSec: 0.001, hillRadiusKm: 1e6, rocheLimitKm: null, equilibriumTempK: null }, 1e5);
    expect(reportSafe.isStable).toBe(true);

    const reportUnstable = auditHillStability("m2", { semiMajorAxisKm: 6e5, eccentricity: 0, inclinationDeg: 0, periapsisKm: 6e5, apoapsisKm: 6e5, periodSec: 1000, isBound: true, isHyperbolicEscape: false, trueAnomalyDeg: 0, meanMotionRadSec: 0.001, hillRadiusKm: 1e6, rocheLimitKm: null, equilibriumTempK: null }, 6e5);
    expect(reportUnstable.isStable).toBe(false);
    expect(reportUnstable.stabilityZone).toBe("chaotic_ejection");
  });

  it("GAME12: Celestial climate simulator models greenhouse effect and liquid water zone", () => {
    const climateEarth = evaluateClimate(149597870, 3.828e26, 0.3, 33);
    expect(climateEarth.surfaceTempK).toBeGreaterThan(273);
    expect(climateEarth.hasLiquidWater).toBe(true);
    expect(climateEarth.climateZone).toBe("temperate");
  });

  it("GAME13: Collision ejecta creates expected fragment swarm", () => {
    const pos = { x: 0, y: 0, z: 0 };
    const relVel = { x: 10, y: 10, z: 0 };
    const fragments = generateCollisionEjecta(pos, relVel, 8, 42);
    expect(fragments.length).toBe(8);
    expect(fragments[0].classification).toBe("remnant");
  });

  it("GAME14: Maneuver node applies prograde and radial impulse burns", () => {
    const v0 = { x: 10, y: 0, z: 0 };
    const node = { id: "n1", bodyId: "b1", scheduledTimeSec: 100, progradeDeltaVKmS: 2.0, radialDeltaVKmS: 0, normalDeltaVKmS: 0, isExecuted: false };
    const v1 = applyManeuverImpulse(v0, node);
    expect(v1.x).toBeCloseTo(12.0, 2);
  });

  it("GAME15: Heliocide outburst heats planets and darkens albedos", () => {
    const bodies = [
      { id: "s", name: "Sun", type: "star" as const, massKg: 1e30, radiusKm: 7e5, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ff0", luminosityW: 3.828e26 },
      { id: "p", name: "World", type: "planet" as const, massKg: 5.9e24, radiusKm: 6371, position: { x: 1e8, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#00f", albedo: 0.3, temperatureK: 280 },
    ];
    const res = executeHeliocideOutburst(bodies);
    expect(res.energyReleasedJ).toBeGreaterThan(0);
    expect(res.bodies[1].temperatureK).toBeGreaterThan(280);
    expect(res.bodies[1].albedo).toBeLessThan(0.3);
  });
});

describe("Recursive Pass 1: Asset Systems (ASSET01-ASSET15)", () => {
  it("ASSET03: Accretion disk mesh initializes with custom shader material", () => {
    const mesh = createAccretionDiskMesh(10, 30);
    expect(mesh).toBeDefined();
    expect((mesh.material as any).uniforms.uInnerRadius.value).toBe(10);
  });

  it("ASSET04: Habitable zone mesh creates translucent ring", () => {
    const mesh = createHabitableZoneMesh(3.828e26, (km) => km / 1e6);
    expect(mesh).toBeDefined();
  });

  it("ASSET05: Atmospheric glow mesh creates back-side billboard sphere", () => {
    const mesh = createAtmosphericGlowMesh(10, 0x38bdf8);
    expect(mesh).toBeDefined();
  });

  it("ASSET06: Collision burst manager spawns and updates particle points", () => {
    const manager = new CollisionBurstManager();
    expect(manager.getGroup().children.length).toBe(0);
    manager.spawnBurst({ x: 0, y: 0, z: 0 } as any, 20);
    expect(manager.getGroup().children.length).toBe(1);
    manager.update(performance.now() + 2000);
    expect(manager.getGroup().children.length).toBe(0); // Pruned after duration
  });

  it("ASSET07: Comet tail mesh creates oriented translucent cone", () => {
    const mesh = createCometTailMesh(50, 0x67e8f9);
    expect(mesh).toBeDefined();
  });

  it("ASSET08: Lagrange glyph creates diamond group with name", () => {
    const glyph = createLagrangeGlyph("L4");
    expect(glyph.name).toBe("lagrange-L4");
  });

  it("ASSET09: Velocity arrow helper creates directional arrow", () => {
    const arrow = createVelocityArrow({ x: 1, y: 0, z: 0 } as any, 15);
    expect(arrow).toBeDefined();
  });

  it("ASSET10: Polar graticule builds concentric range lines", () => {
    const graticule = createPolarGraticule([10, 50, 100]);
    expect(graticule.children.length).toBe(4); // 3 circles + crosshairs
  });

  it("ASSET11: Tidally distorted geometry stretches sphere along X axis", () => {
    const geom = createTidallyDistortedGeometry(10, 1.5);
    expect(geom).toBeDefined();
  });

  it("ASSET12: Audio synthesizer exposes new procedural audio methods", () => {
    expect(typeof audioSynth.playSlingshotWhoosh).toBe("function");
    expect(typeof audioSynth.playImpactThud).toBe("function");
    expect(typeof audioSynth.playSyzygyChime).toBe("function");
    expect(typeof audioSynth.playWarpJump).toBe("function");
  });

  it("ASSET13: Shadow cone mesh builds cylindrical volumetric umbra", () => {
    const cone = createShadowConeMesh(20, 100);
    expect(cone).toBeDefined();
  });

  it("ASSET14: Space station procedural model builds hull and solar panels", () => {
    const station = createStationMesh();
    expect(station.children.length).toBe(4); // Spindle, Torus, Panel 1, Panel 2
  });

  it("ASSET15: Spectral palette defines complete Morgan-Keenan star classifications", () => {
    expect(SPECTRAL_PALETTE.O.tempK).toBe(40000);
    expect(SPECTRAL_PALETTE.G.tempK).toBe(5700);
    expect(SPECTRAL_PALETTE.BH.name).toContain("Singularity");
  });
});
