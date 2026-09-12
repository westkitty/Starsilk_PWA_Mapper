import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TemporalHistoryBuffer } from '../rendering/temporal-history';
import { FateLensRenderer } from '../rendering/fate-lens-renderer';
import { ScaleTransform } from '../rendering/scale-transform';
import { FloatingOrigin } from '../rendering/floating-origin';
import { SimulationEngine } from '../simulation/engine';
import { BranchManager } from '../branching/branch-manager';
import { CelestialBody } from '../simulation/types';

describe('Fate Lens Temporal Engine & Invariants', () => {
  it('enforces bounded capacity on presentation temporal history buffer', () => {
    const maxSamples = 20;
    const buffer = new TemporalHistoryBuffer(maxSamples, 0.1);

    for (let i = 0; i < 50; i++) {
      buffer.recordSample(
        'planet-1',
        { x: i * 1000, y: 0, z: 0 },
        { x: 0, y: 30, z: 0 },
        i * 1.0 // Time advances by 1.0s each step
      );
    }

    // Must never exceed maxSamples (20)
    expect(buffer.getSampleCount('planet-1')).toBe(maxSamples);

    // Oldest sample should have shifted forward (sample 30 to 49)
    const echoes = buffer.getRecentEchoes('planet-1', 5);
    expect(echoes.length).toBe(5);

    // First echo should be normalizedAge = 1.0 (oldest), last should be 0.0 (newest)
    expect(echoes[0].normalizedAge).toBeCloseTo(1.0);
    expect(echoes[echoes.length - 1].normalizedAge).toBeCloseTo(0.0);
    expect(echoes[echoes.length - 1].timestampSec).toBe(49.0);
  });

  it('rate-limits temporal sampling to prevent duplicate entries when simulation is paused or stalled', () => {
    const buffer = new TemporalHistoryBuffer(50, 0.25);

    // First sample recorded
    const recorded1 = buffer.recordSample('planet-1', { x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10.0);
    expect(recorded1).toBe(true);

    // Second sample at same timeSec (paused) -> rejected
    const recorded2 = buffer.recordSample('planet-1', { x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10.0);
    expect(recorded2).toBe(false);

    // Third sample with delta < 0.25s -> rejected
    const recorded3 = buffer.recordSample('planet-1', { x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10.1);
    expect(recorded3).toBe(false);

    // Fourth sample with delta >= 0.25s -> accepted
    const recorded4 = buffer.recordSample('planet-1', { x: 101, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10.3);
    expect(recorded4).toBe(true);

    expect(buffer.getSampleCount('planet-1')).toBe(2);
  });

  it('prunes future-dated samples when time scrubs backward or jumps', () => {
    const buffer = new TemporalHistoryBuffer(50, 0.1);

    // Record samples up to T=5.0s
    for (let t = 1.0; t <= 5.0; t += 1.0) {
      buffer.recordSample('planet-1', { x: t * 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, t);
    }
    expect(buffer.getSampleCount('planet-1')).toBe(5);

    // Scrub backward to T=2.5s -> samples at T=3, 4, 5 must be pruned
    buffer.recordSample('planet-1', { x: 25, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 2.5);
    expect(buffer.getSampleCount('planet-1')).toBe(3); // T=1.0, T=2.0, T=2.5

    const echoes = buffer.getRecentEchoes('planet-1', 3);
    expect(echoes[echoes.length - 1].timestampSec).toBe(2.5);
  });

  it('clears presentation history completely on reset, preventing stale trajectory leakage', () => {
    const buffer = new TemporalHistoryBuffer(50, 0.1);
    buffer.recordSample('body-a', { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1.0);
    buffer.recordSample('body-b', { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1.0);

    expect(buffer.getSampleCount('body-a')).toBe(1);
    expect(buffer.getSampleCount('body-b')).toBe(1);

    buffer.clearBody('body-a');
    expect(buffer.getSampleCount('body-a')).toBe(0);
    expect(buffer.getSampleCount('body-b')).toBe(1);

    buffer.clear();
    expect(buffer.getSampleCount('body-b')).toBe(0);
  });

  it('proves Fate Lens is strictly derived: simulation engine state remains 100% identical with or without Fate Lens', () => {
    const makeSystem = () => {
      const star: CelestialBody = {
        id: 'star-1',
        name: 'Sun',
        type: 'star',
        massKg: 1.989e30,
        radiusKm: 696340,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#ffcc00',
        fixed: true,
      };
      const earth: CelestialBody = {
        id: 'planet-1',
        name: 'Earth',
        type: 'planet',
        massKg: 5.972e24,
        radiusKm: 6371,
        position: { x: 149597870.7, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 29.78 },
        color: '#2277ff',
      };
      return [star, earth];
    };

    // Engine A: run purely without Fate Lens
    const engineA = new SimulationEngine(makeSystem());

    // Engine B: run alongside Fate Lens presentation buffer
    const engineB = new SimulationEngine(makeSystem());
    const fateBuffer = new TemporalHistoryBuffer(60, 0.1);

    const steps = 60;
    const dt = 60.0;

    for (let i = 0; i < steps; i++) {
      engineA.update(dt);
      engineB.update(dt);

      // Fate Lens presentation sampling for engine B
      for (const b of engineB.bodies) {
        fateBuffer.recordSample(b.id, b.position, b.velocity, engineB.timeSec);
      }
      fateBuffer.getRecentEchoes('planet-1', 6);
    }

    // Check strict identity between Engine A and Engine B
    expect(engineA.timeSec).toBe(engineB.timeSec);
    expect(engineA.bodies.length).toBe(engineB.bodies.length);

    for (let i = 0; i < engineA.bodies.length; i++) {
      const bA = engineA.bodies[i];
      const bB = engineB.bodies[i];

      expect(bA.position.x).toBe(bB.position.x);
      expect(bA.position.y).toBe(bB.position.y);
      expect(bA.position.z).toBe(bB.position.z);
      expect(bA.velocity.x).toBe(bB.velocity.x);
      expect(bA.velocity.y).toBe(bB.velocity.y);
      expect(bA.velocity.z).toBe(bB.velocity.z);
      expect(bA.massKg).toBe(bB.massKg);
      expect(bA.radiusKm).toBe(bB.radiusKm);
    }
  });

  it('supports multi-branch comparison without corrupting branch snapshots', () => {
    const star: CelestialBody = {
      id: 'star-1',
      name: 'Sun',
      type: 'star',
      massKg: 1.989e30,
      radiusKm: 696340,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      color: '#ffcc00',
    };
    const planet: CelestialBody = {
      id: 'planet-1',
      name: 'Terra',
      type: 'planet',
      massKg: 5.972e24,
      radiusKm: 6371,
      position: { x: 1.5e8, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 30 },
      color: '#0cc6ff',
    };

    const engine = new SimulationEngine([star, planet]);
    const branchManager = new BranchManager(engine, 'Prime Timeline');

    // Fork alternate branch with modified planet velocity
    const branchAlt = branchManager.forkBranch('Ejection Future', engine);
    const altPlanet = engine.bodies.find(b => b.id === 'planet-1')!;
    altPlanet.velocity.z = 100.0; // Hyperbolic ejection velocity
    branchManager.checkpointActiveBranch(engine);

    // Switch back to Prime
    branchManager.switchBranch('branch-prime', engine);

    // Verify both branches retain their separate states
    const primeBranch = branchManager.branches.get('branch-prime')!;
    const altBranch = branchManager.branches.get(branchAlt.id)!;

    const primePlanet = primeBranch.snapshot.bodies.find(b => b.id === 'planet-1')!;
    const ejectedPlanet = altBranch.snapshot.bodies.find(b => b.id === 'planet-1')!;

    expect(primePlanet.velocity.z).toBe(30);
    expect(ejectedPlanet.velocity.z).toBe(100);

    // Compare branches
    const comp = branchManager.compareBranches('branch-prime', branchAlt.id);
    expect(comp).not.toBeNull();
    expect(comp?.survivingInBothCount).toBe(2);
  });

  it('manages Three.js FateLensRenderer lifecycle, visibility, and complete disposal', () => {
    const scaleTransform = new ScaleTransform();
    const floatingOrigin = new FloatingOrigin();
    const fateRenderer = new FateLensRenderer(scaleTransform, floatingOrigin);

    const masterGroup = fateRenderer.getGroup();
    expect(masterGroup).toBeInstanceOf(THREE.Group);
    expect(masterGroup.visible).toBe(false);

    // Activate with no target body -> remains hidden
    fateRenderer.setActive(true);
    expect(masterGroup.visible).toBe(false);

    // Set target body -> becomes visible
    fateRenderer.setTargetBody('planet-1');
    expect(masterGroup.visible).toBe(true);

    // Deactivate -> hides and clears
    fateRenderer.setActive(false);
    expect(masterGroup.visible).toBe(false);

    // Re-activate and update
    fateRenderer.setActive(true);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const body: CelestialBody = {
      id: 'planet-1',
      name: 'Terra',
      type: 'planet',
      massKg: 6e24,
      radiusKm: 6400,
      position: { x: 1000, y: 0, z: 0 },
      velocity: { x: 0, y: 30, z: 0 },
      color: '#0cc6ff',
    };

    const echoes = [
      { positionKm: { x: 900, y: 0, z: 0 }, velocityKmS: { x: 0, y: 30, z: 0 }, timestampSec: 10, ageSec: 5, normalizedAge: 0.5 },
    ];
    const nominalFuture = [{ x: 1100, y: 0, z: 0 }];
    const branchTracks = [
      { branchId: 'alt-1', branchName: 'Fork', colorHex: '#f59e0b', points: [{ x: 1100, y: 100, z: 0 }] },
    ];

    expect(() => {
      fateRenderer.update(0.016, body, echoes, nominalFuture, branchTracks, camera);
    }).not.toThrow();

    // Disposal releases resources cleanly
    expect(() => {
      fateRenderer.dispose();
    }).not.toThrow();
  });

  it('Phase C #16: provides dual-chroma cyan and magenta separation on THEN echoes with monotonic fade', () => {
    const scaleTransform = new ScaleTransform();
    const floatingOrigin = new FloatingOrigin();
    const fateRenderer = new FateLensRenderer(scaleTransform, floatingOrigin);

    fateRenderer.setActive(true);
    fateRenderer.setTargetBody('planet-1');

    const body: CelestialBody = {
      id: 'planet-1',
      name: 'Terra',
      type: 'planet',
      massKg: 6e24,
      radiusKm: 6400,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 30, z: 0 },
      color: '#0cc6ff',
    };

    const echoes = [
      { positionKm: { x: 10000000, y: 0, z: 0 }, velocityKmS: { x: 0, y: 30, z: 0 }, timestampSec: 10, ageSec: 2, normalizedAge: 0.2 },
      { positionKm: { x: 20000000, y: 0, z: 0 }, velocityKmS: { x: 0, y: 30, z: 0 }, timestampSec: 8, ageSec: 4, normalizedAge: 0.8 },
    ];

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 500);

    // Update with ease = 1.0 (fully emerged)
    fateRenderer.update(1.0, body, echoes, [], [], camera);

    const thenGroup = fateRenderer.getGroup().getObjectByName('FateLens_THEN') as THREE.Group;
    expect(thenGroup).toBeDefined();

    const cyanEcho0 = thenGroup.getObjectByName('echo-cyan-0') as THREE.Mesh;
    const magentaEcho0 = thenGroup.getObjectByName('echo-magenta-0') as THREE.Mesh;

    expect(cyanEcho0).toBeDefined();
    expect(magentaEcho0).toBeDefined();
    expect(cyanEcho0.visible).toBe(true);
    expect(magentaEcho0.visible).toBe(true);

    // Spatial chromatic separation: positions are offset from each other
    expect(cyanEcho0.position.x).not.toBe(magentaEcho0.position.x);

    // Fade hierarchy: recent echo (0) is more opaque than older echo (1)
    const cyanEcho1 = thenGroup.getObjectByName('echo-cyan-1') as THREE.Mesh;
    expect(cyanEcho1.visible).toBe(true);
    expect((cyanEcho0.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(
      (cyanEcho1.material as THREE.MeshBasicMaterial).opacity
    );

    fateRenderer.dispose();
  });

  it('Phase C #17: computes ensemble dispersion divergence intensity and locks classification honestly', () => {
    expect(FateLensRenderer.instrumentClassification).toBe('DIVERGENCE INTENSITY');
    expect(FateLensRenderer.metricType).toContain('ENSEMBLE DISPERSION');
    expect(FateLensRenderer.instrumentClassification).not.toContain('Lyapunov');

    const scaleTransform = new ScaleTransform();
    const floatingOrigin = new FloatingOrigin();
    const fateRenderer = new FateLensRenderer(scaleTransform, floatingOrigin);

    fateRenderer.setActive(true);
    fateRenderer.setTargetBody('planet-1');

    const body: CelestialBody = {
      id: 'planet-1',
      name: 'Terra',
      type: 'planet',
      massKg: 6e24,
      radiusKm: 6400,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 30, z: 0 },
      color: '#0cc6ff',
    };

    const branchTracks = [
      { branchId: 'b1', branchName: 'Branch 1', colorHex: '#0cc6ff', points: [{ x: 10000, y: 0, z: 0 }, { x: 20000, y: 0, z: 0 }] },
      { branchId: 'b2', branchName: 'Branch 2', colorHex: '#ef4444', points: [{ x: 10000, y: 0, z: 0 }, { x: 80000, y: 60000, z: 0 }] },
    ];

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    fateRenderer.update(1.0, body, [], [], branchTracks, camera);

    // Divergence intensity should reflect dispersion across branches (> 0)
    expect(fateRenderer.getDivergenceIntensity()).toBeGreaterThan(0.2);

    fateRenderer.dispose();
  });
});

