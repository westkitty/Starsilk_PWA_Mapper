import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { StarfieldRenderer, evaluateStellarDensityField } from '../rendering/starfield-renderer';
import { SimulationEngine } from '../simulation/engine';
import { CelestialBody } from '../simulation/types';
import { calculateSystemEnergy } from '../simulation/integrator';

describe('Procedural 3D Starfield & Continuous Camera Parallax Suite', () => {
  let renderer: StarfieldRenderer;

  beforeEach(() => {
    renderer = new StarfieldRenderer(1.0, 0x12345678);
  });

  afterEach(() => {
    renderer.dispose();
  });

  it('1. guarantees deterministic generation from identical seed', () => {
    const seed = 0xabcdef;
    const sf1 = new StarfieldRenderer(1.0, seed);
    const sf2 = new StarfieldRenderer(1.0, seed);

    const layers1 = sf1.getLayers();
    const layers2 = sf2.getLayers();

    expect(layers1.length).toBe(layers2.length);

    for (let l = 0; l < layers1.length; l++) {
      const pos1 = layers1[l].geometry.getAttribute('position').array as Float32Array;
      const pos2 = layers2[l].geometry.getAttribute('position').array as Float32Array;
      expect(pos1.length).toBe(pos2.length);

      for (let i = 0; i < pos1.length; i++) {
        expect(pos1[i]).toBe(pos2[i]);
      }

      const col1 = layers1[l].geometry.getAttribute('color').array as Float32Array;
      const col2 = layers2[l].geometry.getAttribute('color').array as Float32Array;
      for (let i = 0; i < col1.length; i++) {
        expect(col1[i]).toBe(col2[i]);
      }

      const par1 = layers1[l].geometry.getAttribute('aParallax').array as Float32Array;
      const par2 = layers2[l].geometry.getAttribute('aParallax').array as Float32Array;
      for (let i = 0; i < par1.length; i++) {
        expect(par1[i]).toBe(par2[i]);
      }
    }

    sf1.dispose();
    sf2.dispose();
  });

  it('2. enforces strictly bounded star counts and layer allocations', () => {
    const layers = renderer.getLayers();
    expect(layers).toHaveLength(3);

    const deep = layers.find(l => l.name === 'deep');
    const mid = layers.find(l => l.name === 'mid');
    const near = layers.find(l => l.name === 'near');

    expect(deep).toBeDefined();
    expect(mid).toBeDefined();
    expect(near).toBeDefined();

    expect(deep!.count).toBe(3000);
    expect(mid!.count).toBe(1200);
    expect(near!.count).toBe(350);

    expect(renderer.getTotalStarCount()).toBe(4550);
  });

  it('3. generates valid, finite 3D coordinates and attributes without NaN or Infinity', () => {
    for (const layer of renderer.getLayers()) {
      const posAttr = layer.geometry.getAttribute('position');
      const colAttr = layer.geometry.getAttribute('color');
      const sizeAttr = layer.geometry.getAttribute('aSize');
      const alphaAttr = layer.geometry.getAttribute('aAlpha');
      const haloAttr = layer.geometry.getAttribute('aHalo');
      const parallaxAttr = layer.geometry.getAttribute('aParallax');

      expect(posAttr).toBeDefined();
      expect(colAttr).toBeDefined();
      expect(sizeAttr).toBeDefined();
      expect(alphaAttr).toBeDefined();
      expect(haloAttr).toBeDefined();
      expect(parallaxAttr).toBeDefined();

      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i];
        const y = pos[i + 1];
        const z = pos[i + 2];

        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(Number.isFinite(z)).toBe(true);

        const r = Math.sqrt(x * x + y * y + z * z);
        expect(r).toBeGreaterThanOrEqual(layer.minRadius - 1.0);
        expect(r).toBeLessThanOrEqual(layer.maxRadius + 1.0);
      }

      const colors = colAttr.array as Float32Array;
      for (let i = 0; i < colors.length; i++) {
        expect(Number.isFinite(colors[i])).toBe(true);
        // Restrained astronomical tints in Linear-sRGB: all channels strictly in [0.50, 1.0] (zero saturated primaries)
        expect(colors[i]).toBeGreaterThanOrEqual(0.50);
        expect(colors[i]).toBeLessThanOrEqual(1.0);
      }

      const sizes = sizeAttr.array as Float32Array;
      for (let i = 0; i < sizes.length; i++) {
        expect(Number.isFinite(sizes[i])).toBe(true);
        expect(sizes[i]).toBeGreaterThan(0);
      }

      const alphas = alphaAttr.array as Float32Array;
      for (let i = 0; i < alphas.length; i++) {
        expect(Number.isFinite(alphas[i])).toBe(true);
        expect(alphas[i]).toBeGreaterThanOrEqual(0);
        expect(alphas[i]).toBeLessThanOrEqual(1.0);
      }

      const halos = haloAttr.array as Float32Array;
      for (let i = 0; i < halos.length; i++) {
        expect(Number.isFinite(halos[i])).toBe(true);
        expect(halos[i]).toBeGreaterThanOrEqual(0);
        expect(halos[i]).toBeLessThanOrEqual(1.0);
      }

      const parallaxes = parallaxAttr.array as Float32Array;
      for (let i = 0; i < parallaxes.length; i++) {
        expect(Number.isFinite(parallaxes[i])).toBe(true);
        expect(parallaxes[i]).toBeGreaterThanOrEqual(0.005);
        expect(parallaxes[i]).toBeLessThanOrEqual(0.50);
      }
    }
  });

  it('4. proves seamless overlapping depth radii and nominal parallax hierarchies', () => {
    const layers = renderer.getLayers();
    const deep = layers.find(l => l.name === 'deep')!;
    const mid = layers.find(l => l.name === 'mid')!;
    const near = layers.find(l => l.name === 'near')!;

    // Nominal parallax hierarchy: Near > Mid > Deep
    expect(near.parallaxFactor).toBeGreaterThan(mid.parallaxFactor);
    expect(mid.parallaxFactor).toBeGreaterThan(deep.parallaxFactor);

    expect(near.parallaxFactor).toBe(0.40);
    expect(mid.parallaxFactor).toBe(0.15);
    expect(deep.parallaxFactor).toBe(0.02);

    // Seamless overlapping radial boundaries (eliminating discrete gap steps)
    expect(near.minRadius).toBeLessThan(mid.minRadius);
    expect(mid.minRadius).toBeLessThan(deep.minRadius);
    expect(near.maxRadius).toBeGreaterThan(mid.minRadius); // Overlaps Mid
    expect(mid.maxRadius).toBeGreaterThan(deep.minRadius); // Overlaps Deep
  });

  it('5. proves continuous per-star parallax distribution (thousands of distinct velocities)', () => {
    const allParallaxes: number[] = [];
    for (const layer of renderer.getLayers()) {
      const parAttr = layer.geometry.getAttribute('aParallax');
      const arr = parAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        allParallaxes.push(Number(arr[i].toFixed(5)));
      }
    }

    expect(allParallaxes).toHaveLength(4550);

    // Set of distinct parallax factors should contain thousands of continuous values, not 3
    const uniqueValues = new Set(allParallaxes);
    expect(uniqueValues.size).toBeGreaterThan(1500);

    // Continuous dynamic range spans from very deep (~0.008) to very near (~0.45)
    const minP = Math.min(...allParallaxes);
    const maxP = Math.max(...allParallaxes);
    expect(minP).toBeLessThanOrEqual(0.015);
    expect(maxP).toBeGreaterThanOrEqual(0.40);
  });

  it('6. proves realistic skewed stellar magnitude power-law distribution', () => {
    let faintCount = 0;
    let brightAnchorCount = 0;
    let totalStars = 0;

    for (const layer of renderer.getLayers()) {
      const sizes = layer.geometry.getAttribute('aSize').array as Float32Array;
      const alphas = layer.geometry.getAttribute('aAlpha').array as Float32Array;

      for (let i = 0; i < sizes.length; i++) {
        totalStars++;
        // Faint stars: small size and restrained alpha
        if (sizes[i] < 2.5 && alphas[i] < 0.60) {
          faintCount++;
        }
        // Bright anchor stars: prominent size and high alpha
        if (sizes[i] > 4.0 && alphas[i] > 0.80) {
          brightAnchorCount++;
        }
      }
    }

    expect(totalStars).toBe(4550);
    // Skewed power law: vast majority are faint background stars (> 65%)
    expect(faintCount / totalStars).toBeGreaterThan(0.65);
    // Rare anchors make up a small minority (< 8%)
    expect(brightAnchorCount / totalStars).toBeLessThan(0.08);
  });

  it('7. verifies deterministic density field evaluation for starfield geography', () => {
    const beltNormal = new THREE.Vector3(0.35, 0.80, 0.48).normalize();
    // In-plane vector is orthogonal to the belt normal: dot(normal, v) = 0 -> beltDist = 0 (highest concentration)
    const inBeltPlane = new THREE.Vector3().crossVectors(beltNormal, new THREE.Vector3(0, 1, 0)).normalize();
    // Belt pole vector is parallel to the belt normal: dot(normal, v) = 1 -> beltDist = 1 (lowest concentration)
    const atBeltPole = beltNormal.clone();

    const thetaPlane = Math.atan2(inBeltPlane.z, inBeltPlane.x);
    const sinPhiPlane = Math.sqrt(Math.max(0, 1.0 - inBeltPlane.y * inBeltPlane.y));
    const beltDensity = evaluateStellarDensityField(
      inBeltPlane.x, inBeltPlane.y, inBeltPlane.z, thetaPlane, sinPhiPlane
    );

    const thetaPole = Math.atan2(atBeltPole.z, atBeltPole.x);
    const sinPhiPole = Math.sqrt(Math.max(0, 1.0 - atBeltPole.y * atBeltPole.y));
    const poleDensity = evaluateStellarDensityField(
      atBeltPole.x, atBeltPole.y, atBeltPole.z, thetaPole, sinPhiPole
    );

    // In-plane stars have strictly higher concentration than belt pole stars
    expect(beltDensity).toBeGreaterThan(poleDensity);
    expect(beltDensity).toBeGreaterThanOrEqual(0.80);
    expect(poleDensity).toBeLessThan(0.70);
  });

  it('8. verifies GPU camera position uniform synchronization during update', () => {
    const cam = new THREE.PerspectiveCamera(45, 1.0, 0.1, 50000);
    cam.position.set(1234, -567, 890);

    renderer.update(cam);
    const uPos = renderer.getCameraPosUniform();

    expect(uPos.x).toBe(1234);
    expect(uPos.y).toBe(-567);
    expect(uPos.z).toBe(890);
  });

  it('9. releases all GPU resources cleanly upon disposal', () => {
    const root = renderer.getGroup();
    expect(root.children.length).toBe(3);

    renderer.dispose();

    expect(renderer.getLayers()).toHaveLength(0);
    expect(root.children.length).toBe(0);

    // Calling dispose again is safe and idempotent
    expect(() => renderer.dispose()).not.toThrow();
  });

  it('10. proves zero mutation of simulation engine physics or celestial bodies', () => {
    const engine = new SimulationEngine();
    const testStar: CelestialBody = {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      type: 'star',
      massKg: 1.989e30,
      radiusKm: 696340,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      fixed: true,
      color: '#ffcc00',
    };
    engine.addBody(testStar);

    const initialTime = engine.timeSec;
    const initialEnergy = calculateSystemEnergy(engine.bodies).total;
    const initialBodiesSnapshot = JSON.stringify(engine.bodies);

    // Render / update starfield across multiple camera translations
    const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 50000);
    camera.position.set(500, 200, 800);
    renderer.update(camera);

    camera.position.set(-1200, 400, 2500);
    renderer.update(camera);

    // Verify engine state is 100% identical
    expect(engine.timeSec).toBe(initialTime);
    expect(calculateSystemEnergy(engine.bodies).total).toBe(initialEnergy);
    expect(JSON.stringify(engine.bodies)).toBe(initialBodiesSnapshot);
  });

  it('11. guarantees starfield points never intercept raycasting or participate in body picking', () => {
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, -1));

    for (const layer of renderer.getLayers()) {
      const intersects = raycaster.intersectObject(layer.points);
      expect(intersects).toHaveLength(0);
    }
  });

  it('12. proves the projection-level parallax invariant: near stars exhibit greater screen displacement than distant stars', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50000);
    camera.position.set(0, 0, 250);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    renderer.update(camera);

    // Sample an arbitrary star from near layer and deep layer
    // Layer 0 is deep, Layer 2 is near
    const nearStar0 = renderer.getStarWorldPosition(2, 0, camera.position);
    const deepStar0 = renderer.getStarWorldPosition(0, 0, camera.position);

    const nearScreen0 = nearStar0.clone().project(camera);
    const deepScreen0 = deepStar0.clone().project(camera);

    // Apply lateral camera translation (panning 800 units to the right)
    camera.position.set(800, 0, 250);
    camera.lookAt(800, 0, 0);
    camera.updateMatrixWorld();

    renderer.update(camera);

    const nearStar1 = renderer.getStarWorldPosition(2, 0, camera.position);
    const deepStar1 = renderer.getStarWorldPosition(0, 0, camera.position);

    const nearScreen1 = nearStar1.clone().project(camera);
    const deepScreen1 = deepStar1.clone().project(camera);

    const nearDisplacement = nearScreen0.distanceTo(nearScreen1);
    const deepDisplacement = deepScreen0.distanceTo(deepScreen1);

    // Near layer MUST exhibit strictly greater screen displacement than deep layer
    expect(nearDisplacement).toBeGreaterThan(deepDisplacement);
    expect(nearDisplacement / Math.max(1e-5, deepDisplacement)).toBeGreaterThan(2.0);
  });
});
