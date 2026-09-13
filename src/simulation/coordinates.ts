/**
 * Astrodynamic Coordinate Transformations.
 * Supports Ecliptic, Equatorial (J2000 obliquity), Galactocentric, and Perifocal (P, Q, W) coordinates.
 */

import { Vector3D } from './types';

// Earth's obliquity of the ecliptic at J2000.0 (~23.439281 degrees in radians)
export const J2000_OBLIQUITY_RAD = (23.439281 * Math.PI) / 180;

/**
 * Convert Ecliptic coordinates to Equatorial (J2000) coordinates.
 */
export function eclipticToEquatorial(v: Vector3D, obliquity = J2000_OBLIQUITY_RAD): Vector3D {
  const cosEps = Math.cos(obliquity);
  const sinEps = Math.sin(obliquity);

  return {
    x: v.x,
    y: v.y * cosEps - v.z * sinEps,
    z: v.y * sinEps + v.z * cosEps,
  };
}

/**
 * Convert Equatorial (J2000) coordinates to Ecliptic coordinates.
 */
export function equatorialToEcliptic(v: Vector3D, obliquity = J2000_OBLIQUITY_RAD): Vector3D {
  const cosEps = Math.cos(obliquity);
  const sinEps = Math.sin(obliquity);

  return {
    x: v.x,
    y: v.y * cosEps + v.z * sinEps,
    z: -v.y * sinEps + v.z * cosEps,
  };
}

/**
 * Convert Perifocal (orbital plane P, Q, W) coordinates to Heliocentric Cartesian coordinates
 * given inclination (i), longitude of ascending node (Omega), and argument of periapsis (omega).
 * All angles in radians.
 */
export function perifocalToCartesian(
  p: Vector3D,
  inclinationRad: number,
  raanRad: number,
  argPeriapsisRad: number
): Vector3D {
  const cosO = Math.cos(raanRad);
  const sinO = Math.sin(raanRad);
  const cosW = Math.cos(argPeriapsisRad);
  const sinW = Math.sin(argPeriapsisRad);
  const cosI = Math.cos(inclinationRad);
  const sinI = Math.sin(inclinationRad);

  // Direction cosine matrix components
  const Px = cosO * cosW - sinO * sinW * cosI;
  const Py = sinO * cosW + cosO * sinW * cosI;
  const Pz = sinW * sinI;

  const Qx = -cosO * sinW - sinO * cosW * cosI;
  const Qy = -sinO * sinW + cosO * cosW * cosI;
  const Qz = cosW * sinI;

  const Wx = sinO * sinI;
  const Wy = -cosO * sinI;
  const Wz = cosI;

  return {
    x: p.x * Px + p.y * Qx + p.z * Wx,
    y: p.x * Py + p.y * Qy + p.z * Wy,
    z: p.x * Pz + p.y * Qz + p.z * Wz,
  };
}

/**
 * Calculate the invariable Laplace plane normal of a multi-body system
 * by summing total angular momentum vectors L = sum(m_i * (r_i x v_i)).
 */
export function calculateInvariablePlaneNormal(
  bodies: Array<{ massKg: number; position: Vector3D; velocity: Vector3D }>
): Vector3D {
  let lx = 0;
  let ly = 0;
  let lz = 0;

  for (const b of bodies) {
    const rx = b.position.x;
    const ry = b.position.y;
    const rz = b.position.z;
    const vx = b.velocity.x;
    const vy = b.velocity.y;
    const vz = b.velocity.z;

    // Cross product r x v
    const cx = ry * vz - rz * vy;
    const cy = rz * vx - rx * vz;
    const cz = rx * vy - ry * vx;

    lx += b.massKg * cx;
    ly += b.massKg * cy;
    lz += b.massKg * cz;
  }

  const mag = Math.sqrt(lx * lx + ly * ly + lz * lz);
  if (mag < 1e-12) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: lx / mag, y: ly / mag, z: lz / mag };
}
