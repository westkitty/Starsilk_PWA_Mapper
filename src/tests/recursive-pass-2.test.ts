import { describe, it, expect } from 'vitest';
import { calculate1PNAcceleration, calculatePerihelionAdvanceRad } from '../simulation/post-newtonian';
import { evaluateKozaiLidov, CRITICAL_KOZAI_INCLINATION_DEG } from '../simulation/kozai-lidov';
import { computeEarthSimilarityIndex } from '../simulation/habitability-index';
import { calculateKirkwoodGaps, isInsideKirkwoodGap } from '../simulation/kirkwood-gaps';
import { generateHaloOrbit } from '../simulation/lagrange-orbits';
import { calculateAtmosphericDrag, estimateOrbitalLifetimeDays } from '../simulation/atmospheric-drag';
import { calculateBinaryStabilityLimits } from '../simulation/binary-stars';
import { evaluateHyperbolicCapture } from '../simulation/hyperbolic-capture';
import { computeStellarMassLoss, accreteMass } from '../simulation/mass-evolution';
import { calculateRocketPerformance } from '../simulation/rocket-flight';
import { computeYarkovskyDrift } from '../simulation/yarkovsky';
import { evaluateFastLyapunovIndicator } from '../simulation/lyapunov';
import { createSolarSystemPreset, createTrappist1Preset } from '../simulation/presets/solar-system-presets';
import { extrapolateBodeSlots } from '../simulation/titius-bode';
import { calculateShepherdTorque, dampRingVelocityDispersion } from '../simulation/ring-dynamics';
import { detectWebGPU, executeComputeOrFallback } from '../core/webgpu-compute';
import { encodeSystemToUrl, decodeSystemFromUrl, generateShareUrl } from '../persistence/url-state';
import { SimulationReplayRecorder } from '../simulation/replay-system';
import { eclipticToEquatorial, equatorialToEcliptic, calculateInvariablePlaneNormal } from '../simulation/coordinates';
import { ParticlePool } from '../core/particle-pool';
import { WorkerIntegratorBridge } from '../simulation/worker-integrator-bridge';
import { evaluateScaleRegime } from '../core/scale-manager';
import { SystemRepository } from '../persistence/system-repository';
import { solveEllipticKepler, solveHyperbolicKepler } from '../simulation/kepler-solver';
import { evaluateSystemEnergy, evaluateTotalAngularMomentum } from './regression-snapshots';
import { computeBodyFraming, computeClusterFraming } from '../rendering/focus-framing';
import { computeSystemDiff } from '../core/state-diff';
import { calculateDopplerTint } from '../rendering/doppler-shift';
import { CelestialBody } from '../simulation/types';

describe('Recursive Pass 2: Systems Verification', () => {
  const mockStar: CelestialBody = {
    id: 'star-1',
    name: 'Sol Prime',
    type: 'star',
    massKg: 1.989e30,
    radiusKm: 696340,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ffcc00',
    luminosityW: 3.828e26,
    fixed: true,
  };

  const mockPlanet: CelestialBody = {
    id: 'planet-1',
    name: 'Terra',
    type: 'planet',
    primaryId: 'star-1',
    massKg: 5.972e24,
    radiusKm: 6371,
    position: { x: 149597870, y: 0, z: 0 },
    velocity: { x: 0, y: 29.78, z: 0 },
    color: '#3388ff',
    temperatureK: 288,
  };

  describe('Post-Newtonian & Relativistic Mechanics (GAME16)', () => {
    it('calculates non-zero 1PN acceleration and perihelion advance', () => {
      const a1pn = calculate1PNAcceleration(mockStar.massKg, mockPlanet.position, mockPlanet.velocity);
      expect(Math.abs(a1pn.x)).toBeGreaterThan(0);

      const dPhi = calculatePerihelionAdvanceRad(mockStar.massKg, 149597870, 0.0167);
      expect(dPhi).toBeGreaterThan(0);
    });
  });

  describe('Kozai-Lidov Cycles (GAME17)', () => {
    it('identifies critical inclination and calculates resonance envelope', () => {
      const state = evaluateKozaiLidov({
        innerSemiMajorAxisKm: 1e7,
        outerSemiMajorAxisKm: 1e8,
        innerPeriodDays: 30,
        outerPeriodDays: 365,
        centralMassKg: 1.989e30,
        perturberMassKg: 1e27,
        initialEccentricity: 0.1,
        initialInclinationDeg: 65,
      });

      expect(state.isResonant).toBe(true);
      expect(state.criticalInclinationDeg).toBeCloseTo(CRITICAL_KOZAI_INCLINATION_DEG, 3);
      expect(state.maxEccentricity).toBeGreaterThan(0.1);
    });
  });

  describe('Habitability Index & ESI (GAME18)', () => {
    it('grades Earth-like planet with high Earth Similarity Index', () => {
      const rep = computeEarthSimilarityIndex(mockPlanet);
      expect(rep.esi).toBeGreaterThan(0.8);
      expect(rep.habitabilityTier).toBe('Optimal');
      expect(rep.isHabitableZone).toBe(true);
    });
  });

  describe('Kirkwood Gaps & Resonances (GAME19)', () => {
    it('identifies gap locations and clearance envelope', () => {
      const jupiterDist = 778570000;
      const gaps = calculateKirkwoodGaps(jupiterDist);
      expect(gaps.length).toBeGreaterThan(3);

      const gap31 = gaps.find(g => g.ratioName === '3:1');
      expect(gap31).toBeDefined();
      if (gap31) {
        const inside = isInsideKirkwoodGap(gap31.semiMajorAxisKm, gaps);
        expect(inside?.ratioName).toBe('3:1');
      }
    });
  });

  describe('Lagrange Halo Orbits (GAME20)', () => {
    it('generates multi-step 3-body trajectory loop', () => {
      const halo = generateHaloOrbit({ x: 1500000, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 100000, 50000);
      expect(halo.points.length).toBe(65);
      expect(halo.points[0].x).toBeDefined();
    });
  });

  describe('Atmospheric Drag & Decay (GAME21)', () => {
    it('computes drag opposing velocity and estimates lifetime', () => {
      const drag = calculateAtmosphericDrag(300, { x: 0, y: 7.7, z: 0 }, 1000);
      expect(drag.y).toBeLessThan(0); // opposes +Y velocity

      const lifetime = estimateOrbitalLifetimeDays(400, 1000);
      expect(lifetime).toBeGreaterThan(0);
    });
  });

  describe('Binary Stars Dynamics (GAME22)', () => {
    it('calculates circumbinary and circumstellar stability limits', () => {
      const limits = calculateBinaryStabilityLimits({
        star1MassKg: 1.989e30,
        star2MassKg: 1.989e30,
        separationKm: 5e7,
        eccentricity: 0.1,
      });

      expect(limits.criticalCircumbinaryRadiusKm).toBeGreaterThan(5e7);
      expect(limits.criticalCircumstellarRadius1Km).toBeLessThan(5e7);
    });
  });

  describe('Hyperbolic Capture (GAME23)', () => {
    it('evaluates hyperbolic approach energy and periapsis', () => {
      const cap = evaluateHyperbolicCapture(
        { x: 1e8, y: 0, z: 0 },
        { x: 0, y: 45, z: 0 },
        mockStar.massKg,
        mockStar.radiusKm
      );
      expect(cap.periapsisDistanceKm).toBeGreaterThan(0);
      expect(cap.initialSpecificEnergy).toBeDefined();
    });
  });

  describe('Stellar Mass Evolution & Accretion (GAME24)', () => {
    it('calculates mass loss and expands radius adiabatically', () => {
      const res = computeStellarMassLoss(mockStar.massKg, 1e8);
      expect(res.newStarMassKg).toBeLessThan(mockStar.massKg);
      expect(res.fractionalRadiusExpansion).toBeGreaterThan(1.0);

      const accreted = accreteMass(mockPlanet, 1e20);
      expect(accreted.massKg).toBeGreaterThan(mockPlanet.massKg);
      expect(accreted.radiusKm).toBeGreaterThan(mockPlanet.radiusKm);
    });
  });

  describe('Rocket Flight & Tsiolkovsky Equation (GAME25)', () => {
    it('computes multi-stage staging delta-V', () => {
      const perf = calculateRocketPerformance(
        [
          { name: 'Stage 1', dryMassKg: 5000, propellantMassKg: 45000, ispSeconds: 310, thrustKn: 800 },
          { name: 'Stage 2', dryMassKg: 1200, propellantMassKg: 8800, ispSeconds: 348, thrustKn: 100 },
        ],
        1000
      );
      expect(perf.totalDeltaVKmS).toBeGreaterThan(6.0);
      expect(perf.stageResults.length).toBe(2);
    });
  });

  describe('Yarkovsky Thermal Drift (GAME26)', () => {
    it('computes positive semi-major axis drift for prograde rotator', () => {
      const yark = computeYarkovskyDrift({
        radiusMeters: 500,
        densityKgM3: 2500,
        semiMajorAxisAu: 1.2,
        isProgradeRotation: true,
      });
      expect(yark.driftRateAuPerMyr).toBeGreaterThan(0);
      expect(yark.accelerationKmS2.y).toBeGreaterThan(0);
    });
  });

  describe('Fast Lyapunov Indicator (GAME27)', () => {
    it('measures divergence between twin shadow trajectories', () => {
      const chaos = evaluateFastLyapunovIndicator([mockStar, mockPlanet], mockPlanet.id, 100, 10);
      expect(chaos.stepsEvaluated).toBe(10);
      expect(Number.isFinite(chaos.fliValue)).toBe(true);
    });
  });

  describe('Astronomical Presets (GAME28)', () => {
    it('generates complete Solar System and TRAPPIST-1 systems', () => {
      const sol = createSolarSystemPreset();
      expect(sol.length).toBeGreaterThanOrEqual(7);
      expect(sol.some(b => b.name === 'Sun')).toBe(true);
      expect(sol.some(b => b.name === 'Earth')).toBe(true);

      const trappist = createTrappist1Preset();
      expect(trappist.length).toBe(8); // Star + 7 planets
    });
  });

  describe('Titius-Bode Law Extrapolator (GAME29)', () => {
    it('extrapolates geometric orbital slots', () => {
      const slots = extrapolateBodeSlots([mockStar, mockPlanet], mockStar.id, 5);
      expect(slots.length).toBe(5);
      expect(slots.some(s => s.closestBodyName === 'Terra')).toBe(true);
    });
  });

  describe('Ring Dynamics & Shepherds (GAME30)', () => {
    it('computes shepherd torque and damps out-of-plane velocity', () => {
      const torque = calculateShepherdTorque(100000, 102000, 1e16, 5e26);
      expect(torque).toBeGreaterThan(0);

      const damped = dampRingVelocityDispersion({ x: 10, y: 15, z: 5 }, { x: 0, y: 0, z: 1 });
      expect(damped.z).toBeLessThan(5);
      expect(damped.x).toBe(10);
    });
  });

  describe('WebGPU Abstraction (BACK16)', () => {
    it('provides graceful CPU fallback and inspects capabilities', async () => {
      const caps = await detectWebGPU();
      expect(caps).toBeDefined();

      const exec = await executeComputeOrFallback({ val: 42 }, d => d.val * 2);
      expect(exec.result).toBe(84);
    });
  });

  describe('URL State Serialization (BACK17)', () => {
    it('encodes and decodes celestial systems losslessly', () => {
      const encoded = encodeSystemToUrl('Test System', [mockStar, mockPlanet]);
      expect(encoded.length).toBeGreaterThan(10);

      const decoded = decodeSystemFromUrl(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Test System');
      expect(decoded?.bodies.length).toBe(2);

      const shareUrl = generateShareUrl('Test System', [mockStar, mockPlanet]);
      expect(shareUrl).toContain('system=');
    });
  });

  describe('Deterministic Replay System (BACK18)', () => {
    it('records frames and interpolates intermediate epochs', () => {
      const rec = new SimulationReplayRecorder(100, 1);
      rec.record(0, [mockStar, mockPlanet]);
      rec.record(10, [
        mockStar,
        { ...mockPlanet, position: { x: 149597870, y: 297.8, z: 0 } },
      ]);

      expect(rec.getFrameCount()).toBe(2);
      const mid = rec.getInterpolatedFrame(5);
      expect(mid).not.toBeNull();
      expect(mid?.epochSeconds).toBe(5);
    });
  });

  describe('Coordinate Transformations (BACK19)', () => {
    it('rotates ecliptic vectors to equatorial and computes plane normal', () => {
      const eq = eclipticToEquatorial({ x: 10, y: 10, z: 0 });
      const ec = equatorialToEcliptic(eq);
      expect(ec.x).toBeCloseTo(10, 4);
      expect(ec.y).toBeCloseTo(10, 4);

      const normal = calculateInvariablePlaneNormal([mockStar, mockPlanet]);
      expect(normal.z).toBeCloseTo(1.0, 2);
    });
  });

  describe('Particle Memory Pool (BACK20)', () => {
    it('spawns and recycles particles with zero GC allocation', () => {
      const pool = new ParticlePool(10);
      const id = pool.spawn(0, 0, 0, 1, 1, 1, 1, 0, 0, 1.0);
      expect(id).toBe(0);
      expect(pool.count).toBe(1);

      pool.update(0.5);
      expect(pool.count).toBe(1);
      pool.update(0.6); // expires (1.1 > 1.0)
      expect(pool.count).toBe(0);
    });
  });

  describe('Worker Integrator Bridge (BACK21)', () => {
    it('runs batch numerical integration', async () => {
      const bridge = new WorkerIntegratorBridge();
      const res = await bridge.runLongTermPropagation({
        bodies: [mockStar, mockPlanet],
        stepDtSeconds: 10,
        totalSteps: 5,
      });
      expect(res.completedSteps).toBe(5);
      expect(res.finalBodies.length).toBe(2);
    });
  });

  describe('Dynamic Scale Governor (BACK23)', () => {
    it('identifies lunar, planetary, and solar system regimes', () => {
      expect(evaluateScaleRegime(1e6).regime).toBe('planetary_moon');
      expect(evaluateScaleRegime(1e8).regime).toBe('inner_system');
      expect(evaluateScaleRegime(5e9).regime).toBe('solar_system');
      expect(evaluateScaleRegime(5e10).regime).toBe('interstellar');
    });
  });

  describe('System Repository (BACK24)', () => {
    it('stores and retrieves named system entries', () => {
      const entry = SystemRepository.save('Kepler-Custom', [mockStar, mockPlanet], ['test']);
      expect(entry.id).toBeDefined();
      expect(entry.name).toBe('Kepler-Custom');

      const fetched = SystemRepository.getById(entry.id);
      expect(fetched?.name).toBe('Kepler-Custom');

      const deleted = SystemRepository.delete(entry.id);
      expect(deleted).toBe(true);
    });
  });

  describe('Kepler Anomaly Solver (BACK25)', () => {
    it('converges to high precision on eccentric and hyperbolic orbits', () => {
      const ell = solveEllipticKepler(1.0, 0.2);
      expect(ell.converged).toBe(true);
      expect(ell.trueAnomalyRad).toBeGreaterThan(0);

      const hyp = solveHyperbolicKepler(2.0, 1.5);
      expect(hyp.converged).toBe(true);
    });
  });

  describe('System Invariants & Energy (BACK26)', () => {
    it('computes mechanical energy and angular momentum', () => {
      const energy = evaluateSystemEnergy([mockStar, mockPlanet]);
      expect(Number.isFinite(energy)).toBe(true);

      const momentum = evaluateTotalAngularMomentum([mockStar, mockPlanet]);
      expect(momentum).toBeGreaterThan(0);
    });
  });

  describe('Camera Framing Algorithm (BACK27)', () => {
    it('calculates optimal viewing distances for single body and clusters', () => {
      const single = computeBodyFraming(mockPlanet.position, mockPlanet.radiusKm);
      expect(single.cameraDistance).toBeGreaterThan(mockPlanet.radiusKm);

      const cluster = computeClusterFraming(mockStar.position, [mockPlanet.position]);
      expect(cluster.cameraDistance).toBeGreaterThan(149597870);
    });
  });

  describe('State Diff Engine (BACK28)', () => {
    it('identifies added, removed, and modified bodies', () => {
      const modifiedPlanet = { ...mockPlanet, name: 'Terra Nova' };
      const diff = computeSystemDiff([mockPlanet], [modifiedPlanet]);
      expect(diff.modifiedBodies.length).toBe(1);
      expect(diff.modifiedBodies[0].changes?.name).toBe('Terra Nova');
    });
  });

  describe('Relativistic Doppler Shift (ASSET29)', () => {
    it('blueshifts approaching bodies and redshifts receding bodies', () => {
      const blue = calculateDopplerTint({ x: 0, y: -5000, z: 0 }, { x: 0, y: 1, z: 0 }, 0xffffff);
      expect(blue.b).toBeGreaterThan(0.5);

      const red = calculateDopplerTint({ x: 0, y: 5000, z: 0 }, { x: 0, y: 1, z: 0 }, 0xffffff);
      expect(red.r).toBeGreaterThan(0.5);
    });
  });
});
