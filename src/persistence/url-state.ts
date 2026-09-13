/**
 * URL state compression and deserialization.
 * Allows users to share complete or partial star system setups via a URL query param.
 */

import { CelestialBody } from '../simulation/types';

export interface SharedSystemPayload {
  version: number;
  name: string;
  bodies: CelestialBody[];
  timestamp: number;
}

/**
 * Encodes a system into a URL-safe Base64 string.
 */
export function encodeSystemToUrl(name: string, bodies: CelestialBody[]): string {
  const payload: SharedSystemPayload = {
    version: 1,
    name,
    bodies: bodies.map(b => ({
      ...b,
      // Round coordinates slightly to reduce URL length while preserving precision
      position: {
        x: Math.round(b.position.x * 10) / 10,
        y: Math.round(b.position.y * 10) / 10,
        z: Math.round(b.position.z * 10) / 10,
      },
      velocity: {
        x: Math.round(b.velocity.x * 1000) / 1000,
        y: Math.round(b.velocity.y * 1000) / 1000,
        z: Math.round(b.velocity.z * 1000) / 1000,
      },
    })),
    timestamp: Date.now(),
  };

  const json = JSON.stringify(payload);
  if (typeof btoa !== 'undefined') {
    return encodeURIComponent(btoa(encodeURIComponent(json)));
  }
  return encodeURIComponent(Buffer.from(json).toString('base64'));
}

/**
 * Decodes a system from a URL-safe Base64 string.
 */
export function decodeSystemFromUrl(encoded: string): SharedSystemPayload | null {
  try {
    const raw = decodeURIComponent(encoded);
    let json = '';
    if (typeof atob !== 'undefined') {
      json = decodeURIComponent(atob(raw));
    } else {
      json = Buffer.from(raw, 'base64').toString('utf-8');
    }
    const payload = JSON.parse(json) as SharedSystemPayload;
    if (!payload.bodies || !Array.isArray(payload.bodies)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates a full shareable URL containing the ?system= param.
 */
export function generateShareUrl(name: string, bodies: CelestialBody[]): string {
  const code = encodeSystemToUrl(name, bodies);
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('system', code);
    return url.toString();
  }
  return `https://starsilk.local/?system=${code}`;
}
