/**
 * Astronomical Reference Presets.
 * Accurate physical models for the Solar System, Trappist-1, and Alpha Centauri.
 */

import { CelestialBody } from '../types';

export function createSolarSystemPreset(): CelestialBody[] {
  const sun: CelestialBody = {
    id: 'sol',
    name: 'Sun',
    type: 'star',
    massKg: 1.989e30,
    radiusKm: 696340,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ffcc33',
    luminosityW: 3.828e26,
    fixed: true,
  };

  const mercury: CelestialBody = {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    primaryId: 'sol',
    massKg: 3.301e23,
    radiusKm: 2439.7,
    position: { x: 57909000, y: 0, z: 0 },
    velocity: { x: 0, y: 47.36, z: 0 },
    color: '#b5a7a7',
    classification: 'rocky',
    albedo: 0.12,
  };

  const venus: CelestialBody = {
    id: 'venus',
    name: 'Venus',
    type: 'planet',
    primaryId: 'sol',
    massKg: 4.867e24,
    radiusKm: 6051.8,
    position: { x: 108200000, y: 0, z: 0 },
    velocity: { x: 0, y: 35.02, z: 0 },
    color: '#e3bb76',
    classification: 'scorched',
    albedo: 0.77,
    greenhouseOffsetK: 450,
  };

  const earth: CelestialBody = {
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    primaryId: 'sol',
    massKg: 5.972e24,
    radiusKm: 6371.0,
    position: { x: 149598023, y: 0, z: 0 },
    velocity: { x: 0, y: 29.78, z: 0 },
    color: '#4b70dd',
    classification: 'oceanic',
    albedo: 0.306,
    atmosphereColor: '#60a5fa',
    greenhouseOffsetK: 33,
  };

  const mars: CelestialBody = {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    primaryId: 'sol',
    massKg: 6.417e23,
    radiusKm: 3389.5,
    position: { x: 227939366, y: 0, z: 0 },
    velocity: { x: 0, y: 24.07, z: 0 },
    color: '#cc5533',
    classification: 'desert',
    albedo: 0.25,
  };

  const jupiter: CelestialBody = {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    primaryId: 'sol',
    massKg: 1.898e27,
    radiusKm: 69911,
    position: { x: 778570000, y: 0, z: 0 },
    velocity: { x: 0, y: 13.07, z: 0 },
    color: '#c99039',
    classification: 'gas_giant',
    albedo: 0.34,
  };

  const saturn: CelestialBody = {
    id: 'saturn',
    name: 'Saturn',
    type: 'planet',
    primaryId: 'sol',
    massKg: 5.683e26,
    radiusKm: 58232,
    position: { x: 1433530000, y: 0, z: 0 },
    velocity: { x: 0, y: 9.68, z: 0 },
    color: '#e2bf7d',
    classification: 'gas_giant',
    albedo: 0.34,
    rings: [
      {
        id: 'saturn_main_ring',
        name: 'Main Rings',
        innerRadiusKm: 74500,
        outerRadiusKm: 140000,
        normal: { x: 0, y: 0, z: 1 },
        color: '#d4af37',
        opacity: 0.7,
      },
    ],
  };

  return [sun, mercury, venus, earth, mars, jupiter, saturn];
}

export function createTrappist1Preset(): CelestialBody[] {
  const star: CelestialBody = {
    id: 'trappist1',
    name: 'TRAPPIST-1',
    type: 'star',
    massKg: 1.786e29, // 0.0898 M_sun
    radiusKm: 84180, // 0.121 R_sun
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ff4500',
    luminosityW: 2.1e23, // 0.000553 L_sun
    fixed: true,
  };

  // 7 tightly packed resonant Earth-sized planets
  const planetsData = [
    { id: 'b', name: 'TRAPPIST-1b', distKm: 1726000, v: 80.5, massKg: 8.19e24, radiusKm: 7110, color: '#aa7755' },
    { id: 'c', name: 'TRAPPIST-1c', distKm: 2364000, v: 68.8, massKg: 7.81e24, radiusKm: 6980, color: '#cc9966' },
    { id: 'd', name: 'TRAPPIST-1d', distKm: 3332000, v: 57.9, massKg: 2.31e24, radiusKm: 4990, color: '#5588aa' },
    { id: 'e', name: 'TRAPPIST-1e', distKm: 4374000, v: 50.5, massKg: 4.13e24, radiusKm: 5860, color: '#44aa88' }, // habitable
    { id: 'f', name: 'TRAPPIST-1f', distKm: 5760000, v: 44.0, massKg: 6.20e24, radiusKm: 6660, color: '#3388bb' }, // habitable
    { id: 'g', name: 'TRAPPIST-1g', distKm: 7015000, v: 39.8, massKg: 7.90e24, radiusKm: 7340, color: '#7799aa' }, // habitable
    { id: 'h', name: 'TRAPPIST-1h', distKm: 9260000, v: 34.7, massKg: 1.94e24, radiusKm: 4940, color: '#99aabb' },
  ];

  const planets: CelestialBody[] = planetsData.map(p => ({
    id: `trappist_${p.id}`,
    name: p.name,
    type: 'planet',
    primaryId: 'trappist1',
    massKg: p.massKg,
    radiusKm: p.radiusKm,
    position: { x: p.distKm, y: 0, z: 0 },
    velocity: { x: 0, y: p.v, z: 0 },
    color: p.color,
    classification: 'rocky',
  }));

  return [star, ...planets];
}
