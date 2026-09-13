/**
 * Pulsar Relativistic Beams & Magnetic Dipole VFX.
 * Generates paired magnetic jet cones emitted along the magnetic axis of neutron stars.
 */

import * as THREE from 'three';

export interface PulsarBeamConfig {
  beamLength: number;
  coneAngleRad?: number;
  beamColor?: number;
  rotationSpeedRps?: number;
  tiltAngleRad?: number; // Obliquity of magnetic axis relative to spin axis
}

export function createPulsarBeamGroup(config: PulsarBeamConfig): THREE.Group {
  const group = new THREE.Group();
  const length = config.beamLength;
  const radius = length * Math.tan(config.coneAngleRad || 0.08);
  const colorHex = config.beamColor || 0xa855f7; // Electric purple / cyan

  const coneGeo = new THREE.ConeGeometry(radius, length, 32, 1, true);
  // Shift pivot so apex is at the origin
  coneGeo.translate(0, length / 2, 0);

  const material = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // North magnetic beam
  const northBeam = new THREE.Mesh(coneGeo, material);
  group.add(northBeam);

  // South magnetic beam (mirrored 180 degrees)
  const southBeam = new THREE.Mesh(coneGeo, material);
  southBeam.rotation.x = Math.PI;
  group.add(southBeam);

  // Apply magnetic obliquity tilt
  const tilt = config.tiltAngleRad || 0.45; // ~26 degrees
  group.rotation.z = tilt;

  return group;
}
