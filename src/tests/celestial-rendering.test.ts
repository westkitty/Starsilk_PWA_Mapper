import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createBlackHoleMaterial,
  createAccretionDiskMaterial,
  createCoronaMaterial,
  createGasGiantMaterial,
  createOrdinaryRingMaterial,
  createBloodRingMaterial,
  createStarsilkRibbonMaterial,
} from '../rendering/celestial-shaders';
import { CollapsePresentation } from '../rendering/collapse-presentation';

describe('Phase B: Celestial & Starsilk Shaders Suite', () => {
  it('1. creates black hole and accretion disk materials with Doppler asymmetry', () => {
    const bhMat = createBlackHoleMaterial();
    expect(bhMat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(bhMat.uniforms.uTime).toBeDefined();
    expect(bhMat.vertexShader).toContain('vViewDir');
    expect(bhMat.fragmentShader).toContain('photonRing');

    const diskMat = createAccretionDiskMaterial();
    expect(diskMat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(diskMat.transparent).toBe(true);
    expect(diskMat.uniforms.uTime).toBeDefined();
    expect(diskMat.fragmentShader).toContain('dopplerFactor');
    expect(diskMat.fragmentShader).toContain('blueShiftColor');
    expect(diskMat.fragmentShader).toContain('redShiftColor');
  });

  it('2. creates corona material with bounded atmosphere and starsilk bleed response', () => {
    const coronaMat = createCoronaMaterial('#f59e0b', 0.8);
    expect(coronaMat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(coronaMat.uniforms.uBaseColor.value.getHexString()).toBe(new THREE.Color('#f59e0b').getHexString());
    expect(coronaMat.uniforms.uStarsilkBleed.value).toBe(0.8);
    expect(coronaMat.fragmentShader).toContain('prominenceMask');
    expect(coronaMat.fragmentShader).toContain('uStarsilkBleed');
  });

  it('3. creates gas giant material with differential cloud drift and storm vortex', () => {
    const giantMat = createGasGiantMaterial('#e0a96d', '#38bdf8', 123);
    expect(giantMat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(giantMat.uniforms.uSeed.value).toBeCloseTo((123 % 1000) * 0.137, 4);
    expect(giantMat.fragmentShader).toContain('driftDir');
    expect(giantMat.fragmentShader).toContain('stormDist');
  });

  it('4. creates ordinary and blood ring materials with analytic shadow projections', () => {
    const ordinary = createOrdinaryRingMaterial('#c0b49c', 1.0);
    expect(ordinary).toBeInstanceOf(THREE.ShaderMaterial);
    expect(ordinary.uniforms.uParentRadius.value).toBe(1.0);
    expect(ordinary.fragmentShader).toContain('umbraR');
    expect(ordinary.fragmentShader).toContain('penumbraR');

    const blood = createBloodRingMaterial(1.0);
    expect(blood).toBeInstanceOf(THREE.ShaderMaterial);
    expect(blood.fragmentShader).toContain('cellular');
    expect(blood.fragmentShader).toContain('razorGlint');
  });

  it('5. creates starsilk ribbon material with multi-frequency barcode ribbon', () => {
    const ribbon = createStarsilkRibbonMaterial();
    expect(ribbon).toBeInstanceOf(THREE.ShaderMaterial);
    expect(ribbon.fragmentShader).toContain('barcode');
    expect(ribbon.fragmentShader).toContain('edgeGlow');
  });

  it('6. executes CollapsePresentation sequence across compression, implosion, and shock ring', () => {
    const presentation = new CollapsePresentation();
    expect(presentation.isActive()).toBe(false);

    let completed = false;
    presentation.start({
      targetPos: new THREE.Vector3(0, 0, 0),
      initialRadius: 20,
      reducedMotion: false,
      onComplete: () => { completed = true; },
    }, 'star-1');

    expect(presentation.isActive()).toBe(true);
    expect(presentation.getTargetBodyId()).toBe('star-1');

    // Dummy mesh group
    const dummyGroup = new THREE.Group();
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
    coreMesh.name = 'core';
    dummyGroup.add(coreMesh);

    // Advance through stage 1 (compression, delta = 0.5s)
    presentation.update(0.5, dummyGroup);
    expect(coreMesh.scale.x).toBeLessThan(1.0);
    expect(presentation.isActive()).toBe(true);

    // Advance through stage 2 (implosion, delta = 0.8s)
    presentation.update(0.8, dummyGroup);
    expect(coreMesh.scale.x).toBeLessThan(0.6);

    // Advance through stage 3 (shock ring & resolution, delta = 1.2s -> total 2.5s > 2.4s)
    presentation.update(1.2, dummyGroup);
    expect(presentation.isActive()).toBe(false);
    expect(completed).toBe(true);

    presentation.dispose();
  });

  it('7. respects prefers-reduced-motion in CollapsePresentation', () => {
    const presentation = new CollapsePresentation();
    let completed = false;
    presentation.start({
      targetPos: new THREE.Vector3(0, 0, 0),
      initialRadius: 20,
      reducedMotion: true,
      onComplete: () => { completed = true; },
    });

    expect(presentation.isActive()).toBe(true);

    // Reduced motion duration is 0.5s
    presentation.update(0.6);
    expect(presentation.isActive()).toBe(false);
    expect(completed).toBe(true);

    presentation.dispose();
  });
});
