/**
 * ASSET08: Lagrange Point Marker Visuals.
 * Holographic L1–L5 markers calculated dynamically for primary-secondary celestial pairs.
 */

import * as THREE from "three";

export function createLagrangeGlyph(label: string = "L1"): THREE.Group {
  const group = new THREE.Group();
  group.name = `lagrange-${label}`;

  // Outer glowing diamond ring
  const circleGeom = new THREE.RingGeometry(1.2, 1.5, 4);
  circleGeom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(circleGeom, mat);
  group.add(mesh);
  return group;
}

export interface LagrangePointInfo {
  name: string;
  position: { x: number; y: number; z: number };
  stability: 'stable' | 'unstable';
}

export function calculateLagrangePoints(
  primary: { position: { x: number; y: number; z: number }; massKg: number },
  secondary: { position: { x: number; y: number; z: number }; massKg: number }
): LagrangePointInfo[] {
  const dx = secondary.position.x - primary.position.x;
  const dy = secondary.position.y - primary.position.y;
  const dz = secondary.position.z - primary.position.z;
  const R = Math.hypot(dx, dy, dz) || 1;

  const ux = dx / R;
  const uy = dy / R;
  const uz = dz / R;

  // Hill sphere radius approx: r_H = R * (m / 3M)^(1/3)
  const massRatio = secondary.massKg / (3 * Math.max(1, primary.massKg));
  const rHill = R * Math.cbrt(massRatio);

  // L1: Between primary and secondary
  const l1 = {
    name: 'L1',
    position: {
      x: secondary.position.x - ux * rHill,
      y: secondary.position.y - uy * rHill,
      z: secondary.position.z - uz * rHill,
    },
    stability: 'unstable' as const,
  };

  // L2: Beyond secondary
  const l2 = {
    name: 'L2',
    position: {
      x: secondary.position.x + ux * rHill,
      y: secondary.position.y + uy * rHill,
      z: secondary.position.z + uz * rHill,
    },
    stability: 'unstable' as const,
  };

  // L3: Opposite primary
  const l3 = {
    name: 'L3',
    position: {
      x: primary.position.x - ux * R,
      y: primary.position.y - uy * R,
      z: primary.position.z - uz * R,
    },
    stability: 'unstable' as const,
  };

  // L4: 60 degrees ahead in orbital plane
  const cos60 = 0.5;
  const sin60 = Math.sqrt(3) / 2;
  const l4 = {
    name: 'L4',
    position: {
      x: primary.position.x + R * (ux * cos60 - uy * sin60),
      y: primary.position.y + R * (ux * sin60 + uy * cos60),
      z: secondary.position.z,
    },
    stability: 'stable' as const,
  };

  // L5: 60 degrees behind in orbital plane
  const l5 = {
    name: 'L5',
    position: {
      x: primary.position.x + R * (ux * cos60 + uy * sin60),
      y: primary.position.y + R * (-ux * sin60 + uy * cos60),
      z: secondary.position.z,
    },
    stability: 'stable' as const,
  };

  return [l1, l2, l3, l4, l5];
}
