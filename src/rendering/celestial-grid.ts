/**
 * Coordinate Grid Skybox & Celestial Sphere Lines.
 * Renders equatorial, ecliptic, and polar coordinate grid lines on the outer celestial sphere.
 */

import * as THREE from 'three';

export function createCelestialGridSphere(radius = 50000, colorHex = 0x1e293b): THREE.Group {
  const group = new THREE.Group();

  const material = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });

  // Equator circle
  const equatorCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const equatorPoints = equatorCurve.getPoints(128).map(p => new THREE.Vector3(p.x, p.y, 0));
  const equatorGeo = new THREE.BufferGeometry().setFromPoints(equatorPoints);
  group.add(new THREE.Line(equatorGeo, material));

  // Latitude circles at +/- 30 and +/- 60 degrees
  const lats = [30, -30, 60, -60];
  for (const lat of lats) {
    const latRad = (lat * Math.PI) / 180;
    const rRing = radius * Math.cos(latRad);
    const zRing = radius * Math.sin(latRad);

    const curve = new THREE.EllipseCurve(0, 0, rRing, rRing, 0, Math.PI * 2, false, 0);
    const pts = curve.getPoints(64).map(p => new THREE.Vector3(p.x, p.y, zRing));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, material));
  }

  // 12 Longitude meridian lines
  for (let m = 0; m < 12; m++) {
    const phi = (m * Math.PI) / 6;
    const pts: THREE.Vector3[] = [];
    for (let j = -90; j <= 90; j += 5) {
      const th = (j * Math.PI) / 180;
      pts.push(new THREE.Vector3(
        radius * Math.cos(th) * Math.cos(phi),
        radius * Math.cos(th) * Math.sin(phi),
        radius * Math.sin(th)
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, material));
  }

  return group;
}
