/**
 * System Center-of-Mass Barycenter & Stellar Reflex Dynamics.
 * Computes the system barycenter position, velocity, and stellar reflex wobble for exoplanet transit/radial velocity detection.
 */

import { Vector3 } from 'three';
import { CelestialBody } from './types';

export interface BarycenterReport {
  centerOfMass: Vector3;
  barycenterVelocity: Vector3;
  totalMass: number;
  primaryReflexSpeed: number; // Radial velocity semi-amplitude proxy (m/s)
  primaryDisplacementFromBarycenter: number; // In AU or simulation units
}

export class BarycenterDynamics {
  public static computeBarycenter(bodies: CelestialBody[]): BarycenterReport {
    if (bodies.length === 0) {
      return {
        centerOfMass: new Vector3(),
        barycenterVelocity: new Vector3(),
        totalMass: 0,
        primaryReflexSpeed: 0,
        primaryDisplacementFromBarycenter: 0,
      };
    }

    let totalMass = 0;
    const com = new Vector3();
    const comVel = new Vector3();

    for (const b of bodies) {
      const m = b.massKg ?? b.mass ?? 1.0;
      totalMass += m;
      const bPos = new Vector3(b.position.x, b.position.y, b.position.z);
      const bVel = new Vector3(b.velocity.x, b.velocity.y, b.velocity.z);
      com.addScaledVector(bPos, m);
      comVel.addScaledVector(bVel, m);
    }

    if (totalMass > 0) {
      com.divideScalar(totalMass);
      comVel.divideScalar(totalMass);
    }

    // Identify primary (most massive body)
    let primary = bodies[0];
    for (let i = 1; i < bodies.length; i++) {
      const curM = bodies[i].massKg ?? bodies[i].mass ?? 0;
      const primM = primary.massKg ?? primary.mass ?? 0;
      if (curM > primM) primary = bodies[i];
    }

    const primPos = new Vector3(primary.position.x, primary.position.y, primary.position.z);
    const primVel = new Vector3(primary.velocity.x, primary.velocity.y, primary.velocity.z);
    const primaryDisp = primPos.distanceTo(com);
    const primaryRelVel = new Vector3().subVectors(primVel, comVel);
    const reflexSpeed = primaryRelVel.length();

    return {
      centerOfMass: com,
      barycenterVelocity: comVel,
      totalMass,
      primaryReflexSpeed: reflexSpeed,
      primaryDisplacementFromBarycenter: primaryDisp,
    };
  }
}
