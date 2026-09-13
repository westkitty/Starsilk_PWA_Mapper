/**
 * Roche Disruption Dynamic Ring Particle System.
 * Generates an expanding ring debris cloud when a satellite is torn apart by tidal forces.
 */

import * as THREE from 'three';

export interface RocheParticleSystemOptions {
  primaryRadius: number;
  rocheLimitRadius: number;
  debrisColor?: number;
  particleCount?: number;
}

export function createRocheDebrisBelt(options: RocheParticleSystemOptions): THREE.Points {
  const count = options.particleCount || 1500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const baseColor = new THREE.Color(options.debrisColor || 0xd97706);
  const innerR = options.primaryRadius * 1.2;
  const outerR = options.rocheLimitRadius * 1.1;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    // Radial distribution
    const r = innerR + Math.random() * (outerR - innerR);
    const theta = Math.random() * Math.PI * 2;
    // Slight vertical scatter
    const z = (Math.random() - 0.5) * (options.primaryRadius * 0.08);

    positions[idx] = r * Math.cos(theta);
    positions[idx + 1] = r * Math.sin(theta);
    positions[idx + 2] = z;

    colors[idx] = baseColor.r * (0.8 + Math.random() * 0.4);
    colors[idx + 1] = baseColor.g * (0.8 + Math.random() * 0.4);
    colors[idx + 2] = baseColor.b * (0.8 + Math.random() * 0.4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}
