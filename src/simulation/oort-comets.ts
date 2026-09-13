/**
 * Oort-Cloud Long-Period Comet Injection Generator.
 * Generates high-aphelion inbound near-parabolic cometary trajectories toward inner system perihelion.
 * 
 * Note: Generates kinematically targeted inbound trajectories using vis-viva energy
 * and angular momentum conservation; does not simulate external Galactic tidal fields.
 */

import { Vector3 } from 'three';
import { CelestialBody } from './types';

export class OortCometInjector {
  /**
   * Generates an inbound long-period comet with aphelion at ~15,000 AU and targeted perihelion.
   */
  public static spawnInjectedComet(
    id: string,
    name: string,
    primaryMass: number,
    perihelionDistanceAu = 0.5,
    customAngles?: { theta: number; phi: number }
  ): CelestialBody {
    // Generate arrival direction on celestial sphere
    const theta = customAngles ? customAngles.theta : Math.random() * 2 * Math.PI;
    const phi = customAngles ? customAngles.phi : Math.acos(2 * Math.random() - 1);

    const rAphelion = 15000; // AU
    const a = (rAphelion + perihelionDistanceAu) / 2;

    // Initial position at ~60 AU inbound
    const rStart = 60.0;
    const pos = new Vector3(
      rStart * Math.sin(phi) * Math.cos(theta),
      rStart * Math.sin(phi) * Math.sin(theta),
      rStart * Math.cos(phi)
    );

    // Speed from vis-viva equation: v^2 = G * M * (2/r - 1/a)
    const G = 1.0;
    const speed = Math.sqrt(Math.max(0.001, 2 * G * primaryMass / rStart - G * primaryMass / a));

    // Inward velocity with transverse angular momentum for target perihelion
    const inwardDir = new Vector3().copy(pos).negate().normalize();
    const transverseDir = new Vector3(-inwardDir.y, inwardDir.x, inwardDir.z).normalize();
    const hTarget = Math.sqrt(2 * G * primaryMass * perihelionDistanceAu);
    const vTransverse = hTarget / rStart;
    const vRadial = Math.sqrt(Math.max(0, speed * speed - vTransverse * vTransverse));

    const vel = new Vector3()
      .copy(inwardDir)
      .multiplyScalar(vRadial)
      .addScaledVector(transverseDir, vTransverse);

    return {
      id,
      name,
      massKg: 1e12,
      radiusKm: 2.5,
      mass: 1e-10,
      radius: 0.05,
      position: { x: pos.x, y: pos.y, z: pos.z },
      velocity: { x: vel.x, y: vel.y, z: vel.z },
      color: '#a8d5e5',
      type: 'asteroid',
    };
  }
}
