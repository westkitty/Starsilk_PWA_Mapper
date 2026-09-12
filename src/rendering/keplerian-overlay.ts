/**
 * Keplerian Drafting Compass & Equal-Area Wedges.
 *
 * Invariants:
 * - Visualizes mathematically valid Keplerian orbital elements:
 *   periapsis, apoapsis, line of apsides, orbital plane, ascending/descending nodes,
 *   node line, fitted ellipse, focus, and equal-area sweep wedge (Kepler's Second Law).
 * - Pedagogically correct equal-area sweep wedge: dA/dt = h/2 = const.
 * - Does NOT fabricate nodes for degenerate cases (e.g. coplanar orbits where i ~ 0).
 * - Rich overlay while drafting in Orbit Loom; full detail during selected-orbit inspection.
 * - Zero mutation of physics state; complete Three.js lifecycle resource disposal.
 */

import * as THREE from 'three';
import { CelestialBody, OsculatingElements, Vector3D } from '../simulation/types';
import { FittedOrbit } from '../interaction/orbit-loom';
import { ScaleTransform } from './scale-transform';
import { FloatingOrigin } from './floating-origin';

export class KeplerianOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  // Visual sub-groups
  private ellipseLine: THREE.LineLoop;
  private apsidesLine: THREE.Line;
  private nodesLine: THREE.Line;
  private periMarker: THREE.Mesh;
  private apoMarker: THREE.Mesh;
  private focusMarker: THREE.Mesh;
  private ascNodeMarker: THREE.Mesh;
  private descNodeMarker: THREE.Mesh;
  private planeDisk: THREE.Mesh;
  private wedgeMesh: THREE.Mesh;

  // Geometry references for updates
  private ellipseGeo: THREE.BufferGeometry;
  private apsidesGeo: THREE.BufferGeometry;
  private nodesGeo: THREE.BufferGeometry;
  private wedgeGeo: THREE.BufferGeometry;

  // Kepler's 2nd Law animation state
  private sweepAngleRad: number = 0;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = 'KeplerianOverlayGroup';
    this.group.visible = false;

    // 1. Fitted/Osculating Ellipse Line
    this.ellipseGeo = new THREE.BufferGeometry();
    const ellipseMat = new THREE.LineBasicMaterial({
      color: 0x0cc6ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ellipseLine = new THREE.LineLoop(this.ellipseGeo, ellipseMat);
    this.group.add(this.ellipseLine);

    // 2. Line of Apsides (Periapsis -> Focus -> Apoapsis)
    this.apsidesGeo = new THREE.BufferGeometry();
    const apsidesMat = new THREE.LineDashedMaterial({
      color: 0x49e7ff,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.apsidesLine = new THREE.Line(this.apsidesGeo, apsidesMat);
    this.group.add(this.apsidesLine);

    // 3. Line of Nodes (Ascending Node -> Focus -> Descending Node)
    this.nodesGeo = new THREE.BufferGeometry();
    const nodesMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 2,
      gapSize: 2,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.nodesLine = new THREE.Line(this.nodesGeo, nodesMat);
    this.group.add(this.nodesLine);

    // Shared marker geometry: compact diamond octahedron
    const markerGeo = new THREE.OctahedronGeometry(1.2, 0);

    // Periapsis marker (emerald cyan)
    this.periMarker = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.9 })
    );
    this.group.add(this.periMarker);

    // Apoapsis marker (amber)
    this.apoMarker = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.9 })
    );
    this.group.add(this.apoMarker);

    // Focus marker (primary location focus reticle)
    const focusGeo = new THREE.RingGeometry(1.5, 1.8, 32);
    this.focusMarker = new THREE.Mesh(
      focusGeo,
      new THREE.MeshBasicMaterial({ color: 0x0cc6ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    this.focusMarker.rotation.x = Math.PI / 2;
    this.group.add(this.focusMarker);

    // Ascending Node marker (cyan triangle)
    this.ascNodeMarker = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 1.8, 4),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.85 })
    );
    this.group.add(this.ascNodeMarker);

    // Descending Node marker (inverted cyan triangle)
    this.descNodeMarker = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 1.8, 4),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.85 })
    );
    this.descNodeMarker.rotation.x = Math.PI;
    this.group.add(this.descNodeMarker);

    // 4. Orbital Plane subtle disc
    const planeGeo = new THREE.RingGeometry(5, 50, 48);
    this.planeDisk = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x0a2a44,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      })
    );
    this.planeDisk.rotation.x = Math.PI / 2;
    this.group.add(this.planeDisk);

    // 5. Kepler's Second Law: Equal-Area Sweep Wedge
    this.wedgeGeo = new THREE.BufferGeometry();
    const wedgeMat = new THREE.MeshBasicMaterial({
      color: 0x0cc6ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.wedgeMesh = new THREE.Mesh(this.wedgeGeo, wedgeMat);
    this.group.add(this.wedgeMesh);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) {
      this.clear();
    }
  }

  /**
   * Update overlay from active Orbit Loom drafting state.
   */
  public updateFromFittedOrbit(orbit: FittedOrbit, primary: CelestialBody, deltaSec: number = 0.016): void {
    this.setVisible(true);

    const a = orbit.semiMajorAxisKm;
    const e = orbit.eccentricity;
    const rot = orbit.periapsisAngleRad;
    const primPos = primary.position;
    const segments = 96;

    const ellipsePts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = (a * (1.0 - e * e)) / (1.0 + e * Math.cos(theta));
      const xKm = primPos.x + r * Math.cos(theta + rot);
      const zKm = primPos.z + r * Math.sin(theta + rot);

      const rel = this.floatingOrigin.toRelative({ x: xKm, y: primPos.y, z: zKm });
      const disp = this.scaleTransform.getDisplayPosition(rel);
      ellipsePts.push(new THREE.Vector3(disp.x, disp.y, disp.z));
    }
    this.ellipseGeo.setFromPoints(ellipsePts);

    // Focus display position
    const focusRel = this.floatingOrigin.toRelative(primPos);
    const focusDisp = this.scaleTransform.getDisplayPosition(focusRel);
    this.focusMarker.position.set(focusDisp.x, focusDisp.y, focusDisp.z);
    this.focusMarker.visible = true;

    // Periapsis and Apoapsis positions
    const periRel = this.floatingOrigin.toRelative(orbit.periapsisPositionKm);
    const periDisp = this.scaleTransform.getDisplayPosition(periRel);
    this.periMarker.position.set(periDisp.x, periDisp.y, periDisp.z);
    this.periMarker.visible = true;

    const apoAngle = rot + Math.PI;
    const apoPosKm: Vector3D = {
      x: primPos.x + orbit.apoapsisKm * Math.cos(apoAngle),
      y: primPos.y,
      z: primPos.z + orbit.apoapsisKm * Math.sin(apoAngle),
    };
    const apoRel = this.floatingOrigin.toRelative(apoPosKm);
    const apoDisp = this.scaleTransform.getDisplayPosition(apoRel);
    this.apoMarker.position.set(apoDisp.x, apoDisp.y, apoDisp.z);
    this.apoMarker.visible = true;

    // Line of apsides
    this.apsidesGeo.setFromPoints([
      new THREE.Vector3(periDisp.x, periDisp.y, periDisp.z),
      new THREE.Vector3(focusDisp.x, focusDisp.y, focusDisp.z),
      new THREE.Vector3(apoDisp.x, apoDisp.y, apoDisp.z),
    ]);
    this.apsidesLine.computeLineDistances();
    this.apsidesLine.visible = true;

    // In drafting mode (coplanar XZ plane), nodes are degenerate: hide node markers
    this.nodesLine.visible = false;
    this.ascNodeMarker.visible = false;
    this.descNodeMarker.visible = false;

    // Orbital plane disk centered at focus
    this.planeDisk.position.set(focusDisp.x, focusDisp.y - 0.05, focusDisp.z);
    const maxRDisp = Math.hypot(apoDisp.x - focusDisp.x, apoDisp.z - focusDisp.z) * 1.15;
    this.planeDisk.scale.set(maxRDisp / 50, maxRDisp / 50, maxRDisp / 50);
    this.planeDisk.visible = true;

    // Kepler's Second Law: Equal-Area Sweep Wedge
    this.updateEqualAreaWedge(focusDisp, a, e, rot, orbit.periodSec, primPos, deltaSec);
  }

  /**
   * Update overlay from an inspected body's osculating elements.
   */
  public updateFromOsculating(
    elements: OsculatingElements,
    _body: CelestialBody,
    primary: CelestialBody,
    deltaSec: number = 0.016
  ): void {
    if (!elements.isBound || elements.semiMajorAxisKm <= 0) {
      this.clear();
      return;
    }

    this.setVisible(true);

    const a = elements.semiMajorAxisKm;
    const e = elements.eccentricity;
    const incRad = (elements.inclinationDeg * Math.PI) / 180.0;
    const primPos = primary.position;
    const segments = 96;

    // Orbital plane basis vectors
    // Normal tilted by inclination around X
    const sinI = Math.sin(incRad);
    const cosI = Math.cos(incRad);

    const ellipsePts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = (a * (1.0 - e * e)) / (1.0 + e * Math.cos(theta));
      const inPlaneX = r * Math.cos(theta);
      const inPlaneZ = r * Math.sin(theta);

      // Rotate into 3D: inPlaneZ tilts into Y and Z
      const xKm = primPos.x + inPlaneX;
      const yKm = primPos.y + inPlaneZ * sinI;
      const zKm = primPos.z + inPlaneZ * cosI;

      const rel = this.floatingOrigin.toRelative({ x: xKm, y: yKm, z: zKm });
      const disp = this.scaleTransform.getDisplayPosition(rel);
      ellipsePts.push(new THREE.Vector3(disp.x, disp.y, disp.z));
    }
    this.ellipseGeo.setFromPoints(ellipsePts);

    // Focus
    const focusRel = this.floatingOrigin.toRelative(primPos);
    const focusDisp = this.scaleTransform.getDisplayPosition(focusRel);
    this.focusMarker.position.set(focusDisp.x, focusDisp.y, focusDisp.z);
    this.focusMarker.visible = true;

    // Periapsis & Apoapsis
    const rPeri = elements.periapsisKm;
    const rApo = elements.apoapsisKm;

    const periPosKm: Vector3D = { x: primPos.x + rPeri, y: primPos.y, z: primPos.z };
    const apoPosKm: Vector3D = { x: primPos.x - rApo, y: primPos.y, z: primPos.z };

    const periDisp = this.scaleTransform.getDisplayPosition(this.floatingOrigin.toRelative(periPosKm));
    const apoDisp = this.scaleTransform.getDisplayPosition(this.floatingOrigin.toRelative(apoPosKm));

    this.periMarker.position.set(periDisp.x, periDisp.y, periDisp.z);
    this.periMarker.visible = true;

    this.apoMarker.position.set(apoDisp.x, apoDisp.y, apoDisp.z);
    this.apoMarker.visible = true;

    this.apsidesGeo.setFromPoints([
      new THREE.Vector3(periDisp.x, periDisp.y, periDisp.z),
      new THREE.Vector3(focusDisp.x, focusDisp.y, focusDisp.z),
      new THREE.Vector3(apoDisp.x, apoDisp.y, apoDisp.z),
    ]);
    this.apsidesLine.computeLineDistances();
    this.apsidesLine.visible = true;

    // Nodes: check if inclination is degenerate (< 0.5 degrees)
    if (elements.inclinationDeg > 0.5 && elements.inclinationDeg < 179.5) {
      // Intersection with reference plane Y = primPos.y occurs at inPlaneZ = 0 (theta = 0 and theta = pi)
      const ascPt = ellipsePts[0]; // theta = 0
      const descPt = ellipsePts[Math.floor(segments / 2)]; // theta = pi

      this.ascNodeMarker.position.copy(ascPt);
      this.ascNodeMarker.visible = true;

      this.descNodeMarker.position.copy(descPt);
      this.descNodeMarker.visible = true;

      this.nodesGeo.setFromPoints([
        new THREE.Vector3(ascPt.x, ascPt.y, ascPt.z),
        new THREE.Vector3(focusDisp.x, focusDisp.y, focusDisp.z),
        new THREE.Vector3(descPt.x, descPt.y, descPt.z),
      ]);
      this.nodesLine.computeLineDistances();
      this.nodesLine.visible = true;
    } else {
      // Non-fabrication guardrail: Degenerate coplanar orbit has NO node line
      this.nodesLine.visible = false;
      this.ascNodeMarker.visible = false;
      this.descNodeMarker.visible = false;
    }

    // Orbital plane orientation
    this.planeDisk.position.set(focusDisp.x, focusDisp.y, focusDisp.z);
    this.planeDisk.rotation.x = Math.PI / 2 + incRad;
    const maxRDisp = Math.hypot(apoDisp.x - focusDisp.x, apoDisp.z - focusDisp.z) * 1.15;
    this.planeDisk.scale.set(maxRDisp / 50, maxRDisp / 50, maxRDisp / 50);
    this.planeDisk.visible = true;

    // Kepler's Second Law Equal-Area Wedge
    this.updateEqualAreaWedge(focusDisp, a, e, 0, elements.periodSec, primPos, deltaSec);
  }

  /**
   * Generates authentic Kepler's Second Law Equal-Area Wedge:
   * dA/dt = h/2 = const.
   * Swept sector advances around the focus over time.
   */
  private updateEqualAreaWedge(
    focusDisp: Vector3D,
    aKm: number,
    e: number,
    rotationRad: number,
    periodSec: number,
    primPos: Vector3D,
    deltaSec: number
  ): void {
    if (periodSec <= 0 || !Number.isFinite(periodSec)) {
      this.wedgeMesh.visible = false;
      return;
    }

    // Mean motion n = 2pi / T
    const n = (2.0 * Math.PI) / Math.max(10, periodSec);

    // Dynamic angular velocity at current true anomaly nu:
    // dnu/dt = (n * (1 + e*cos(nu))^2) / (1 - e^2)^(3/2)
    const factor = (1.0 + e * Math.cos(this.sweepAngleRad)) ** 2 / Math.max(0.01, (1.0 - e * e) ** 1.5);
    const dnuDt = n * factor;

    this.sweepAngleRad = (this.sweepAngleRad + dnuDt * deltaSec * 10.0) % (Math.PI * 2);

    // Delta true anomaly for constant time interval dt
    // For visual clarity, span ~0.25 to 0.45 rad depending on speed
    const deltaNu = Math.max(0.12, Math.min(0.55, dnuDt * 4.0));

    // Build triangle fan for wedge
    const wedgeSegments = 16;
    const vertices: number[] = [];

    // Focus vertex is apex of all triangles
    const fx = focusDisp.x;
    const fy = focusDisp.y;
    const fz = focusDisp.z;

    let prevX = 0, prevY = 0, prevZ = 0;

    for (let s = 0; s <= wedgeSegments; s++) {
      const nu = this.sweepAngleRad + (s / wedgeSegments) * deltaNu;
      const r = (aKm * (1.0 - e * e)) / (1.0 + e * Math.cos(nu));
      const xKm = primPos.x + r * Math.cos(nu + rotationRad);
      const zKm = primPos.z + r * Math.sin(nu + rotationRad);

      const rel = this.floatingOrigin.toRelative({ x: xKm, y: primPos.y, z: zKm });
      const disp = this.scaleTransform.getDisplayPosition(rel);

      if (s > 0) {
        // Triangle: apex -> prev -> curr
        vertices.push(fx, fy, fz);
        vertices.push(prevX, prevY, prevZ);
        vertices.push(disp.x, disp.y, disp.z);
      }
      prevX = disp.x;
      prevY = disp.y;
      prevZ = disp.z;
    }

    this.wedgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    this.wedgeGeo.computeVertexNormals();
    this.wedgeMesh.visible = true;
  }

  public clear(): void {
    this.group.visible = false;
    this.ellipseGeo.setFromPoints([]);
    this.apsidesGeo.setFromPoints([]);
    this.nodesGeo.setFromPoints([]);
    this.wedgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    this.periMarker.visible = false;
    this.apoMarker.visible = false;
    this.focusMarker.visible = false;
    this.ascNodeMarker.visible = false;
    this.descNodeMarker.visible = false;
    this.planeDisk.visible = false;
    this.wedgeMesh.visible = false;
  }

  public dispose(): void {
    this.clear();

    this.ellipseGeo.dispose();
    (this.ellipseLine.material as THREE.Material).dispose();

    this.apsidesGeo.dispose();
    (this.apsidesLine.material as THREE.Material).dispose();

    this.nodesGeo.dispose();
    (this.nodesLine.material as THREE.Material).dispose();

    this.periMarker.geometry.dispose();
    (this.periMarker.material as THREE.Material).dispose();

    this.apoMarker.geometry.dispose();
    (this.apoMarker.material as THREE.Material).dispose();

    this.focusMarker.geometry.dispose();
    (this.focusMarker.material as THREE.Material).dispose();

    this.ascNodeMarker.geometry.dispose();
    (this.ascNodeMarker.material as THREE.Material).dispose();

    this.descNodeMarker.geometry.dispose();
    (this.descNodeMarker.material as THREE.Material).dispose();

    this.planeDisk.geometry.dispose();
    (this.planeDisk.material as THREE.Material).dispose();

    this.wedgeGeo.dispose();
    (this.wedgeMesh.material as THREE.Material).dispose();
  }
}
