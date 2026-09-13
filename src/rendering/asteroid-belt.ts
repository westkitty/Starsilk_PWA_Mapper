/**
 * Procedural Asteroid Belt InstancedMesh Generator.
 * Efficiently renders thousands of unique tumbling rocky asteroids in a toroidal belt.
 */

import * as THREE from 'three';

export interface AsteroidBeltVisualConfig {
  innerRadius: number;
  outerRadius: number;
  count?: number;
  thickness?: number;
  baseColor?: number;
  minScale?: number;
  maxScale?: number;
}

export function createAsteroidBeltMesh(config: AsteroidBeltVisualConfig): THREE.InstancedMesh {
  const count = config.count || 2000;
  const thickness = config.thickness || (config.outerRadius - config.innerRadius) * 0.05;
  const baseColor = config.baseColor || 0x887766;
  const minScale = config.minScale || 0.4;
  const maxScale = config.maxScale || 1.8;

  // Low-poly icosahedron geometry for asteroids
  const geometry = new THREE.IcosahedronGeometry(1.0, 1);
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Random radius between inner and outer with square-root distribution for uniform area density
    const rNorm = Math.sqrt(Math.random());
    const r = config.innerRadius + rNorm * (config.outerRadius - config.innerRadius);

    // Random azimuth angle theta
    const theta = Math.random() * Math.PI * 2;

    // Normal distribution around the ecliptic plane for thickness
    const z = (Math.random() - 0.5) * thickness;

    dummy.position.set(r * Math.cos(theta), r * Math.sin(theta), z);

    // Random orientation and tumble
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Random non-uniform scale for rocky jagged appearance
    const scale = minScale + Math.random() * (maxScale - minScale);
    dummy.scale.set(
      scale * (0.8 + Math.random() * 0.4),
      scale * (0.8 + Math.random() * 0.4),
      scale * (0.8 + Math.random() * 0.4)
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Slight albedo variation
    color.setHex(baseColor);
    const shade = 0.7 + Math.random() * 0.6;
    color.multiplyScalar(shade);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  return mesh;
}
