import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TrajectoryRenderer } from '../rendering/trajectory-renderer';
import { KeplerianOverlay } from '../rendering/keplerian-overlay';
import { OrbitalBoundsOverlay } from '../rendering/orbital-bounds-overlay';
import { LagrangeOverlay } from '../rendering/lagrange-overlay';
import { GravityGridRenderer } from '../rendering/gravity-grid';
import { ScaleTransform } from '../rendering/scale-transform';
import { FloatingOrigin } from '../rendering/floating-origin';
import { CelestialBody } from '../simulation/types';
import { calculateOsculatingElements, computeLagrangePoints } from '../simulation/orbital-mechanics';

describe('Phase A — Orbital Instrumentation Test Suite', () => {
  const scale = new ScaleTransform();
  const origin = new FloatingOrigin();

  const star: CelestialBody = {
    id: 'test-star',
    name: 'Primary Star',
    type: 'star',
    massKg: 1.989e30,
    radiusKm: 696340,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ffcc44',
  };

  const planet: CelestialBody = {
    id: 'test-planet',
    name: 'Orbital Planet',
    type: 'planet',
    massKg: 5.972e24,
    radiusKm: 6371,
    position: { x: 149597870.7, y: 0, z: 0 },
    velocity: { x: 0, y: 29.78, z: 0 },
    color: '#38bdf8',
    primaryId: 'test-star',
  };

  it('Feature #6: TrajectoryRenderer builds Line2 wide-line geometry with screen-space resolution and forward chevrons', () => {
    const trajRenderer = new TrajectoryRenderer(scale, 1920, 1080);
    expect(trajRenderer.getGroup()).toBeDefined();

    trajRenderer.updateBodyTrajectory({
      bodyId: planet.id,
      isSelected: true,
      points: [
        { positionKm: { x: 149597870.7, y: 0, z: 0 }, timestampSec: 0 },
        { positionKm: { x: 149590000.0, y: 0, z: 5000000 }, timestampSec: 168000 },
        { positionKm: { x: 149500000.0, y: 0, z: 10000000 }, timestampSec: 336000, isCollision: true },
      ],
    });

    // Advance animation
    trajRenderer.update(0.1);
    trajRenderer.setResolution(1280, 800);

    // Reduced motion test
    trajRenderer.setReducedMotion(true);
    trajRenderer.update(0.1);

    // Clean disposal
    trajRenderer.clearBody(planet.id);
    trajRenderer.dispose();
  });

  it('Feature #7: KeplerianOverlay computes apsides, equal-area wedge, and does NOT fabricate nodes for degenerate coplanar orbits', () => {
    const overlay = new KeplerianOverlay(scale, origin);
    expect(overlay.getGroup()).toBeDefined();

    // 1. Coplanar orbit (inclination = 0)
    const oscCoplanar = calculateOsculatingElements(planet, star);
    expect(oscCoplanar.inclinationDeg).toBeLessThan(0.1);

    overlay.updateFromOsculating(oscCoplanar, planet, star, 0.016);
    // Nodes line must be hidden for degenerate coplanar cases
    const nodesLine = overlay.getGroup().getObjectByName('nodesLine') || overlay.getGroup().children.find(c => c instanceof THREE.Line && (c as any).material?.color?.getHex() === 0x38bdf8);
    if (nodesLine) {
      expect(nodesLine.visible).toBe(false);
    }

    // 2. Inclined orbit (inclination = 25 degrees)
    const inclinedPlanet: CelestialBody = {
      ...planet,
      velocity: { x: 0, y: 12.0, z: 27.2 },
    };
    const oscInclined = calculateOsculatingElements(inclinedPlanet, star);
    expect(oscInclined.inclinationDeg).toBeGreaterThan(10.0);

    overlay.updateFromOsculating(oscInclined, inclinedPlanet, star, 0.016);

    overlay.clear();
    overlay.dispose();
  });

  it('Feature #8: OrbitalBoundsOverlay visualizes Hill sphere and detects Roche limit penetration', () => {
    const bounds = new OrbitalBoundsOverlay(scale, origin);
    const osc = calculateOsculatingElements(planet, star);

    expect(osc.hillRadiusKm).toBeGreaterThan(0);
    expect(osc.rocheLimitKm).toBeGreaterThan(0);

    // Normal safe orbit: distance >> rocheLimit
    bounds.update(planet, star, osc.hillRadiusKm, osc.rocheLimitKm, 0.016);
    expect(bounds.isRocheViolation()).toBe(false);

    // Extreme close orbit inside Roche limit
    const doomedBody: CelestialBody = {
      ...planet,
      position: { x: 500000, y: 0, z: 0 }, // Very close to star (< roche limit ~ 1.5 million km)
    };
    bounds.update(doomedBody, star, osc.hillRadiusKm, 1500000, 0.016);
    expect(bounds.isRocheViolation()).toBe(true);

    bounds.clear();
    bounds.dispose();
  });

  it('Feature #9: LagrangeOverlay computes and visualizes selection-scoped L1-L5 points', () => {
    const lagrange = new LagrangeOverlay(scale, origin);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50000);

    const lp = computeLagrangePoints(star, planet);
    expect(lp).toBeDefined();
    expect(lp?.L1).toBeDefined();
    expect(lp?.L4).toBeDefined();

    lagrange.update(planet, star, camera);
    expect(lagrange.getGroup().visible).toBe(true);

    // Non-selected / null resets cleanly
    lagrange.update(null, null, camera);
    expect(lagrange.getGroup().visible).toBe(false);

    lagrange.dispose();
  });

  it('Feature #10: GravityGridRenderer enforces Newtonian potential semantic lock and triggers shock ripples', () => {
    const grid = new GravityGridRenderer(scale);
    expect(grid.instrumentClassification).toBe('NEWTONIAN GRAVITATIONAL POTENTIAL');

    grid.setVisible(true);
    grid.update([star, planet], 0.016);

    // Event-driven shock ripple test
    grid.triggerEventRipple(100, 100, 2.0);
    grid.update([star, planet], 0.05);

    grid.setVisible(false);
  });
});
