import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { StarfieldRenderer, evaluateStellarDensityField } from '../rendering/starfield-renderer';
import { SimulationEngine } from '../simulation/engine';
import { CelestialBody } from '../simulation/types';
import { calculateSystemEnergy } from '../simulation/integrator';

describe('Dense Procedural 3D Starfield & Continuous Camera Parallax Suite', () => {
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
      const par1 = layers1[l].geometry.getAttribute('aParallax').array as Float32Array;
      const par2 = layers2[l].geometry.getAttribute('aParallax').array as Float32Array;
      expect(Array.from(pos1)).toEqual(Array.from(pos2));
      expect(Array.from(par1)).toEqual(Array.from(par2));
    }

    sf1.dispose();
    sf2.dispose();
  });

  it('2. provides a substantially denser 12,000-star field in only three layers', () => {
    const layers = renderer.getLayers();
    expect(layers).toHaveLength(3);
    expect(layers.find(l => l.name === 'deep')!.count).toBe(7800);
    expect(layers.find(l => l.name === 'mid')!.count).toBe(3200);
    expect(layers.find(l => l.name === 'near')!.count).toBe(1000);
    expect(renderer.getTotalStarCount()).toBe(12000);
  });

  it('3. generates finite coordinates and bounded visual/parallax attributes', () => {
    for (const layer of renderer.getLayers()) {
      const pos = layer.geometry.getAttribute('position').array as Float32Array;
      const colors = layer.geometry.getAttribute('color').array as Float32Array;
      const sizes = layer.geometry.getAttribute('aSize').array as Float32Array;
      const alphas = layer.geometry.getAttribute('aAlpha').array as Float32Array;
      const halos = layer.geometry.getAttribute('aHalo').array as Float32Array;
      const parallaxes = layer.geometry.getAttribute('aParallax').array as Float32Array;

      for (let i = 0; i < pos.length; i += 3) {
        const r = Math.hypot(pos[i], pos[i + 1], pos[i + 2]);
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(layer.minRadius - 1);
        expect(r).toBeLessThanOrEqual(layer.maxRadius + 1);
      }

      for (const value of colors) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0.50);
        expect(value).toBeLessThanOrEqual(1.0);
      }
      for (const value of sizes) expect(value).toBeGreaterThan(0);
      for (const value of alphas) {
        expect(value).toBeGreaterThanOrEqual(0.38);
        expect(value).toBeLessThanOrEqual(1.0);
      }
      for (const value of halos) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1.0);
      }
      for (const value of parallaxes) {
        expect(value).toBeGreaterThanOrEqual(0.008);
        expect(value).toBeLessThanOrEqual(0.70);
      }
    }
  });

  it('4. keeps overlapping depth shells and a strict near > mid > deep parallax hierarchy', () => {
    const [deep, mid, near] = renderer.getLayers();
    expect(near.parallaxFactor).toBeGreaterThan(mid.parallaxFactor);
    expect(mid.parallaxFactor).toBeGreaterThan(deep.parallaxFactor);
    expect(near.maxRadius).toBeGreaterThan(mid.minRadius);
    expect(mid.maxRadius).toBeGreaterThan(deep.minRadius);
  });

  it('5. provides thousands of distinct continuous parallax velocities', () => {
    const all: number[] = [];
    for (const layer of renderer.getLayers()) {
      const values = layer.geometry.getAttribute('aParallax').array as Float32Array;
      for (const value of values) all.push(Number(value.toFixed(5)));
    }
    expect(all).toHaveLength(12000);
    expect(new Set(all).size).toBeGreaterThan(3000);
    expect(Math.min(...all)).toBeLessThanOrEqual(0.02);
    expect(Math.max(...all)).toBeGreaterThanOrEqual(0.58);
  });

  it('6. lifts the visibility floor without flattening the stellar magnitude hierarchy', () => {
    let background = 0;
    let anchors = 0;
    let total = 0;

    for (const layer of renderer.getLayers()) {
      const sizes = layer.geometry.getAttribute('aSize').array as Float32Array;
      const alphas = layer.geometry.getAttribute('aAlpha').array as Float32Array;
      for (let i = 0; i < sizes.length; i++) {
        total++;
        if (sizes[i] < 3.25 && alphas[i] < 0.84) background++;
        if (sizes[i] > 5.0 && alphas[i] > 0.90) anchors++;
      }
    }

    expect(total).toBe(12000);
    expect(background / total).toBeGreaterThan(0.58);
    expect(anchors / total).toBeLessThan(0.10);
    expect(renderer.getBrightness()).toBeGreaterThan(1.0);
  });

  it('7. uses additive emission so stars remain visibly luminous on the dark scene', () => {
    for (const layer of renderer.getLayers()) {
      expect(layer.material.blending).toBe(THREE.AdditiveBlending);
      expect(layer.material.depthWrite).toBe(false);
      expect(layer.material.depthTest).toBe(true);
    }
  });

  it('8. keeps deterministic galactic-belt geography', () => {
    const beltNormal = new THREE.Vector3(0.35, 0.80, 0.48).normalize();
    const inBeltPlane = new THREE.Vector3().crossVectors(beltNormal, new THREE.Vector3(0, 1, 0)).normalize();
    const atBeltPole = beltNormal.clone();
    const beltDensity = evaluateStellarDensityField(
      inBeltPlane.x,
      inBeltPlane.y,
      inBeltPlane.z,
      Math.atan2(inBeltPlane.z, inBeltPlane.x),
      Math.sqrt(Math.max(0, 1 - inBeltPlane.y * inBeltPlane.y))
    );
    const poleDensity = evaluateStellarDensityField(
      atBeltPole.x,
      atBeltPole.y,
      atBeltPole.z,
      Math.atan2(atBeltPole.z, atBeltPole.x),
      Math.sqrt(Math.max(0, 1 - atBeltPole.y * atBeltPole.y))
    );
    expect(beltDensity).toBeGreaterThan(poleDensity);
  });

  it('9. synchronizes the GPU camera position uniform in O(1) update work', () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50000);
    camera.position.set(1234, -567, 890);
    renderer.update(camera);
    expect(renderer.getCameraPosUniform().toArray()).toEqual([1234, -567, 890]);
  });

  it('10. releases GPU resources idempotently', () => {
    const root = renderer.getGroup();
    expect(root.children).toHaveLength(3);
    renderer.dispose();
    expect(renderer.getLayers()).toHaveLength(0);
    expect(root.children).toHaveLength(0);
    expect(() => renderer.dispose()).not.toThrow();
  });

  it('11. never mutates simulation physics or celestial bodies', () => {
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
    const snapshot = JSON.stringify(engine.bodies);

    const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 50000);
    camera.position.set(500, 200, 800);
    renderer.update(camera);
    camera.position.set(-1200, 400, 2500);
    renderer.update(camera);

    expect(engine.timeSec).toBe(initialTime);
    expect(calculateSystemEnergy(engine.bodies).total).toBe(initialEnergy);
    expect(JSON.stringify(engine.bodies)).toBe(snapshot);
  });

  it('12. never intercepts body raycasting', () => {
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, -1));
    for (const layer of renderer.getLayers()) {
      expect(raycaster.intersectObject(layer.points)).toHaveLength(0);
    }
  });

  it('13. makes near stars shift materially more than deep stars under camera translation', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50000);
    camera.position.set(0, 0, 250);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    renderer.update(camera);

    const near0 = renderer.getStarWorldPosition(2, 0, camera.position).clone().project(camera);
    const deep0 = renderer.getStarWorldPosition(0, 0, camera.position).clone().project(camera);

    camera.position.set(800, 0, 250);
    camera.lookAt(800, 0, 0);
    camera.updateMatrixWorld();
    renderer.update(camera);

    const near1 = renderer.getStarWorldPosition(2, 0, camera.position).clone().project(camera);
    const deep1 = renderer.getStarWorldPosition(0, 0, camera.position).clone().project(camera);
    const nearShift = near0.distanceTo(near1);
    const deepShift = deep0.distanceTo(deep1);

    expect(nearShift).toBeGreaterThan(deepShift);
    expect(nearShift / Math.max(1e-5, deepShift)).toBeGreaterThan(3.0);
  });
});
