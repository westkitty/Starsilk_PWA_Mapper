/**
 * Three.js Fate Lens Visualization Renderer.
 *
 * Invariants:
 * - Coordinates: Uses ScaleTransform and FloatingOrigin to render accurately in display space.
 * - Non-mutating: Reads positions and forecast paths; does not alter physics state.
 * - Lifecycle bounded: Pre-allocates geometries and materials, disposes completely on teardown.
 * - Three Temporal Layers:
 *     1. THEN: Fading ghost echoes along past trajectory + connecting temporal filament.
 *     2. NOW: Authoritative celestial focus reticle with cardinal ticks.
 *     3. POSSIBLE: Projected future trajectories with multi-branch divergence comparison.
 */

import * as THREE from 'three';
import { Vector3D, CelestialBody } from '../simulation/types';
import { ScaleTransform } from './scale-transform';
import { FloatingOrigin } from './floating-origin';
import { TemporalEcho } from './temporal-history';

export interface BranchTrajectory {
  branchId: string;
  branchName: string;
  colorHex: string;
  points: Vector3D[];
}

export class FateLensRenderer {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  private isActive: boolean = false;
  private targetBodyId: string | null = null;

  // THEN visual layer
  private thenGroup: THREE.Group;
  private echoMeshes: THREE.Mesh[] = [];
  private pastFilamentLine: THREE.Line;
  private readonly maxEchoes = 8;
  private readonly maxFilamentPoints = 128;

  // NOW visual layer
  private nowGroup: THREE.Group;
  private nowInnerRing: THREE.LineLoop;
  private nowCrosshairs: THREE.LineSegments;

  // POSSIBLE visual layer
  private possibleGroup: THREE.Group;
  private futureBeadMeshes: THREE.Mesh[] = [];
  private readonly maxFutureBeads = 4;
  private branchLines: Map<string, { line: THREE.Line; positions: Float32Array; colors: Float32Array }> = new Map();
  private readonly maxBranchPoints = 250;
  private divergenceMarker: THREE.LineLoop | null = null;

  // Shared reusable geometries
  private sharedEchoSphereGeo: THREE.SphereGeometry;
  private sharedFutureMarkerGeo: THREE.OctahedronGeometry;
  private sharedFilamentGeo!: THREE.BufferGeometry;

  // Animation state
  private rotationAngle: number = 0;
  private apertureProgress: number = 1.0;
  private isEmerging: boolean = false;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = 'FateLensMasterGroup';
    this.group.visible = false;

    // Sub-groups
    this.thenGroup = new THREE.Group();
    this.thenGroup.name = 'FateLens_THEN';
    this.group.add(this.thenGroup);

    this.nowGroup = new THREE.Group();
    this.nowGroup.name = 'FateLens_NOW';
    this.group.add(this.nowGroup);

    this.possibleGroup = new THREE.Group();
    this.possibleGroup.name = 'FateLens_POSSIBLE';
    this.group.add(this.possibleGroup);

    // Geometries
    this.sharedEchoSphereGeo = new THREE.SphereGeometry(1.0, 16, 12);
    this.sharedFutureMarkerGeo = new THREE.OctahedronGeometry(1.0, 0);

    // Initialize THEN layer objects
    this.pastFilamentLine = this.initFilamentLine();
    this.thenGroup.add(this.pastFilamentLine);
    this.initEchoPool();

    // Initialize NOW layer objects
    const { inner, crosshairs } = this.initNowReticle();
    this.nowInnerRing = inner;
    this.nowCrosshairs = crosshairs;
    this.nowGroup.add(this.nowInnerRing);
    this.nowGroup.add(this.nowCrosshairs);

    // Initialize POSSIBLE layer objects
    this.initFutureBeadsPool();
    this.initDivergenceMarker();
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    this.group.visible = active && !!this.targetBodyId;
    if (active) {
      this.apertureProgress = 0.0;
      this.isEmerging = true;
    } else {
      this.clearVisuals();
    }
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setTargetBody(bodyId: string | null): void {
    const isNew = this.targetBodyId !== bodyId;
    this.targetBodyId = bodyId;
    this.group.visible = this.isActive && !!bodyId;
    if (!bodyId) {
      this.clearVisuals();
    } else if (isNew && this.isActive) {
      this.clearVisuals();
      this.apertureProgress = 0.0;
      this.isEmerging = true;
    }
  }

  public getTargetBodyId(): string | null {
    return this.targetBodyId;
  }

  // --- THEN LAYER SETUP ---
  private initFilamentLine(): THREE.Line {
    this.sharedFilamentGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.maxFilamentPoints * 3);
    const col = new Float32Array(this.maxFilamentPoints * 3);
    this.sharedFilamentGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sharedFilamentGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Line(this.sharedFilamentGeo, mat);
  }

  private initEchoPool(): void {
    for (let i = 0; i < this.maxEchoes; i++) {
      // Translucent ghost sphere in Starsilk azure
      const mat = new THREE.MeshBasicMaterial({
        color: '#0cc6ff',
        transparent: true,
        opacity: 0.2,
        wireframe: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedEchoSphereGeo, mat);
      mesh.visible = false;
      this.echoMeshes.push(mesh);
      this.thenGroup.add(mesh);
    }
  }

  // --- NOW LAYER SETUP ---
  private initNowReticle(): { inner: THREE.LineLoop; crosshairs: THREE.LineSegments } {
    // Primary measurement ring
    const innerGeo = this.createRingGeometry(1.35, 48);
    const innerMat = new THREE.LineBasicMaterial({
      color: '#0cc6ff',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inner = new THREE.LineLoop(innerGeo, innerMat);

    // Cardinal tick crosshairs (calibrated ticks extending across the measurement ring from 1.20 to 1.55)
    const crosshairGeo = new THREE.BufferGeometry();
    const chPos = new Float32Array([
      0, 1.20, 0, 0, 1.55, 0,
      0, -1.20, 0, 0, -1.55, 0,
      1.20, 0, 0, 1.55, 0, 0,
      -1.20, 0, 0, -1.55, 0, 0,
    ]);
    crosshairGeo.setAttribute('position', new THREE.BufferAttribute(chPos, 3));
    const chMat = new THREE.LineBasicMaterial({
      color: '#49e7ff',
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const crosshairs = new THREE.LineSegments(crosshairGeo, chMat);

    return { inner, crosshairs };
  }

  // --- POSSIBLE LAYER SETUP ---
  private initFutureBeadsPool(): void {
    for (let i = 0; i < this.maxFutureBeads; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#f59e0b', // Prospective amber
        transparent: true,
        opacity: 0.5,
        wireframe: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedFutureMarkerGeo, mat);
      mesh.visible = false;
      this.futureBeadMeshes.push(mesh);
      this.possibleGroup.add(mesh);
    }
  }

  private initDivergenceMarker(): void {
    // Diamond divergence marker
    const geo = new THREE.BufferGeometry();
    const pts = new Float32Array([
      0, 1, 0,
      1, 0, 0,
      0, -1, 0,
      -1, 0, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#f59e0b', // Amber
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.divergenceMarker = new THREE.LineLoop(geo, mat);
    this.divergenceMarker.visible = false;
    this.possibleGroup.add(this.divergenceMarker);
  }

  private createRingGeometry(radius: number, segments: number): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }

  /**
   * Main per-frame update for Fate Lens.
   */
  public update(
    deltaSec: number,
    currentBody: CelestialBody | null,
    echoes: TemporalEcho[],
    nominalFuturePoints: Vector3D[],
    branchTrajectories: BranchTrajectory[],
    camera: THREE.Camera
  ): void {
    if (!this.isActive || !currentBody || currentBody.id !== this.targetBodyId) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // Advance reticle rotation
    this.rotationAngle += deltaSec * 0.4;

    // Advance aperture emergence if active
    if (this.isEmerging) {
      this.apertureProgress = Math.min(1.0, this.apertureProgress + deltaSec / 0.35);
      if (this.apertureProgress >= 1.0) {
        this.isEmerging = false;
      }
    }
    const ease = 1 - Math.pow(1 - this.apertureProgress, 3);

    // Relative display position and radius of authoritative body
    const relCurrent = this.floatingOrigin.toRelative(currentBody.position);
    const dispCurrent = this.scaleTransform.getDisplayPosition(relCurrent);
    const dispRadius = this.scaleTransform.getDisplayRadius(currentBody.radiusKm, currentBody.type);

    // Adaptive scale: ensure reticle and markers remain legible across extreme camera distances (10 to 15,000 units)
    const dx = camera.position.x - dispCurrent.x;
    const dy = camera.position.y - dispCurrent.y;
    const dz = camera.position.z - dispCurrent.z;
    const camDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minAngularRadius = Math.max(0.2, camDist * 0.012);
    const effectiveRadius = Math.max(dispRadius, minAngularRadius);

    // 1. UPDATE NOW RETICLE
    this.updateNowReticle(dispCurrent, effectiveRadius, camera, ease);

    // 2. UPDATE THEN ECHOES & FILAMENT
    this.updateThenEchoes(echoes, dispCurrent, effectiveRadius, currentBody.color, ease);

    // 3. UPDATE POSSIBLE FUTURE TRAJECTORIES & BRANCHES
    this.updatePossibleFutures(nominalFuturePoints, branchTrajectories, dispCurrent, effectiveRadius, ease);
  }

  private updateNowReticle(dispPos: Vector3D, dispRadius: number, camera: THREE.Camera, ease: number): void {
    this.nowGroup.position.set(dispPos.x, dispPos.y, dispPos.z);

    // Billboard towards camera so reticle is always visible
    this.nowGroup.quaternion.copy(camera.quaternion);

    // Scale reticle to surround body, expanding outward during emergence
    const scale = dispRadius * (0.85 + 0.15 * ease);
    this.nowGroup.scale.set(scale, scale, scale);

    // Fade reticle elements with ease
    (this.nowInnerRing.material as THREE.LineBasicMaterial).opacity = 0.90 * ease;
    (this.nowCrosshairs.material as THREE.LineBasicMaterial).opacity = 0.80 * ease;

    // Steady instrument rotation: inner ring rotates with subtle azimuth indexing
    this.nowInnerRing.rotation.z = this.rotationAngle * 0.5;
    this.nowCrosshairs.rotation.z = this.rotationAngle * 0.25;
  }

  private updateThenEchoes(
    echoes: TemporalEcho[],
    dispCurrent: Vector3D,
    currentRadius: number,
    bodyColorHex: string,
    ease: number
  ): void {
    const echoCount = Math.min(echoes.length, this.maxEchoes);
    const deepVoidColor = new THREE.Color('#0a2a44');
    const azureColor = new THREE.Color('#0cc6ff');
    const baseColor = new THREE.Color(bodyColorHex || '#0cc6ff');

    // Positions for connecting filament line
    const filamentGeo = this.pastFilamentLine.geometry;
    const posAttr = filamentGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = filamentGeo.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let ptIdx = 0;

    for (let i = 0; i < echoCount; i++) {
      const echo = echoes[i];
      const relEcho = this.floatingOrigin.toRelative(echo.positionKm);
      const dispEcho = this.scaleTransform.getDisplayPosition(relEcho);

      // Chronological age: 1.0 = newest (closest to now), 0.0 = oldest (deep history)
      const tRecent = 1.0 - echo.normalizedAge;

      // Progressive fading: older echoes recede into void
      const fade = Math.max(0.08, 0.08 + Math.pow(tRecent, 1.4) * 0.42);
      // Pronounced size recession: older echoes noticeably smaller (0.55 -> 0.95)
      const sizeScale = currentRadius * (0.55 + tRecent * 0.40);

      // Emergence threshold: recent echoes emerge first, then older echoes
      const echoEmergence = Math.max(0, Math.min(1.0, (ease - (1.0 - tRecent) * 0.5) / 0.5));

      // Suppress echo mesh if coincident with current body to prevent ghost wireframe inside planet core
      const distToCurrent = Math.hypot(dispEcho.x - dispCurrent.x, dispEcho.y - dispCurrent.y, dispEcho.z - dispCurrent.z);
      const isCoincident = distToCurrent < currentRadius * 0.75;

      const mesh = this.echoMeshes[i];
      mesh.visible = echoEmergence > 0.01 && !isCoincident;
      mesh.position.set(dispEcho.x, dispEcho.y, dispEcho.z);
      mesh.scale.set(sizeScale, sizeScale, sizeScale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = fade * echoEmergence;

      // Spectral decay: pigment leaches from bodyColor -> azure -> deepVoidColor
      if (tRecent > 0.5) {
        (mesh.material as THREE.MeshBasicMaterial).color.lerpColors(azureColor, baseColor, (tRecent - 0.5) * 2.0);
      } else {
        (mesh.material as THREE.MeshBasicMaterial).color.lerpColors(deepVoidColor, azureColor, tRecent * 2.0);
      }

      // Add to filament path with matching spectral fade
      if (ptIdx < this.maxFilamentPoints) {
        posArr[ptIdx * 3] = dispEcho.x;
        posArr[ptIdx * 3 + 1] = dispEcho.y;
        posArr[ptIdx * 3 + 2] = dispEcho.z;

        const echoColor = (mesh.material as THREE.MeshBasicMaterial).color;
        colArr[ptIdx * 3] = echoColor.r * fade;
        colArr[ptIdx * 3 + 1] = echoColor.g * fade;
        colArr[ptIdx * 3 + 2] = echoColor.b * fade;
        ptIdx++;
      }
    }

    // Connect filament line to current authoritative body
    if (echoCount > 0 && ptIdx < this.maxFilamentPoints) {
      posArr[ptIdx * 3] = dispCurrent.x;
      posArr[ptIdx * 3 + 1] = dispCurrent.y;
      posArr[ptIdx * 3 + 2] = dispCurrent.z;

      colArr[ptIdx * 3] = azureColor.r * 0.8;
      colArr[ptIdx * 3 + 1] = azureColor.g * 0.8;
      colArr[ptIdx * 3 + 2] = azureColor.b * 0.8;
      ptIdx++;
    }

    // Hide remaining unused echo meshes
    for (let i = echoCount; i < this.maxEchoes; i++) {
      this.echoMeshes[i].visible = false;
    }

    // Filament smoothly uncoils with ease
    const visibleFilamentCount = Math.round(ptIdx * ease);
    filamentGeo.setDrawRange(0, visibleFilamentCount);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  private updatePossibleFutures(
    nominalPoints: Vector3D[],
    branchTrajectories: BranchTrajectory[],
    _dispCurrent: Vector3D,
    currentRadius: number,
    ease: number
  ): void {
    // 1. Multi-branch divergent trajectory rendering
    const allTracks: { id: string; points: Vector3D[]; colorHex: string; isNominal?: boolean }[] = [];

    // If alternate branches exist, compare their paths
    if (branchTrajectories && branchTrajectories.length > 0) {
      for (const bt of branchTrajectories) {
        allTracks.push({
          id: bt.branchId,
          points: bt.points,
          colorHex: bt.colorHex,
        });
      }
    } else if (nominalPoints && nominalPoints.length > 0) {
      // Default single-branch nominal trajectory (prospective amber)
      allTracks.push({
        id: 'nominal-future',
        points: nominalPoints,
        colorHex: '#f59e0b',
        isNominal: true,
      });
    }

    // Synchronize branch line objects
    const activeTrackIds = new Set(allTracks.map(t => t.id));
    for (const [id, entry] of this.branchLines) {
      if (!activeTrackIds.has(id)) {
        this.possibleGroup.remove(entry.line);
        entry.line.geometry.dispose();
        (entry.line.material as THREE.Material).dispose();
        this.branchLines.delete(id);
      }
    }

    let firstDivergenceDisp: Vector3D | null = null;

    for (const track of allTracks) {
      let entry = this.branchLines.get(track.id);
      if (!entry) {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxBranchPoints * 3);
        const colors = new Float32Array(this.maxBranchPoints * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        this.possibleGroup.add(line);
        entry = { line, positions, colors };
        this.branchLines.set(track.id, entry);
      }

      const { line, positions, colors } = entry;
      const count = Math.min(track.points.length, this.maxBranchPoints);
      const trackColor = new THREE.Color(track.colorHex);

      for (let i = 0; i < count; i++) {
        const relPt = this.floatingOrigin.toRelative(track.points[i]);
        const dispPt = this.scaleTransform.getDisplayPosition(relPt);

        positions[i * 3] = dispPt.x;
        positions[i * 3 + 1] = dispPt.y;
        positions[i * 3 + 2] = dispPt.z;

        // Optical projection taper along forecast horizon: brightness fades as temporal distance increases.
        // NOTE: This is a visual presentation falloff, not a statistical confidence or probability estimate.
        const frac = i / Math.max(1, count - 1);
        const projectionTaper = Math.exp(-frac * 2.0); // 1.0 down to ~0.13
        const baseAlpha = Math.max(0.04, projectionTaper * 0.85);

        // In multi-branch mode, keep alternate branches subtle while coincident with primary
        let branchWeight = 1.0;
        if (allTracks.length > 1 && track !== allTracks[0]) {
          const refPt = allTracks[0].points[i];
          if (refPt) {
            const dist = Math.hypot(track.points[i].x - refPt.x, track.points[i].y - refPt.y, track.points[i].z - refPt.z);
            branchWeight = dist > 10000 ? 1.0 : Math.max(0.2, dist / 10000);
          }
        }

        const alpha = baseAlpha * branchWeight;
        colors[i * 3] = trackColor.r * alpha;
        colors[i * 3 + 1] = trackColor.g * alpha;
        colors[i * 3 + 2] = trackColor.b * alpha;
      }

      // Smoothly unroll trajectory forward into future
      const visibleCount = Math.round(count * ease);
      line.geometry.setDrawRange(0, visibleCount);
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.attributes.color.needsUpdate = true;

      // Detect divergence if multiple tracks exist
      if (allTracks.length > 1 && !firstDivergenceDisp && track.points.length > 5) {
        const refTrack = allTracks[0];
        for (let i = 0; i < Math.min(track.points.length, refTrack.points.length); i++) {
          const pA = track.points[i];
          const pB = refTrack.points[i];
          const dx = pA.x - pB.x;
          const dy = pA.y - pB.y;
          const dz = pA.z - pB.z;
          if (Math.hypot(dx, dy, dz) > 10000.0) { // Significant divergence
            const relDiv = this.floatingOrigin.toRelative(pA);
            firstDivergenceDisp = this.scaleTransform.getDisplayPosition(relDiv);
            break;
          }
        }
      }
    }

    // 2. Divergence Marker
    if (this.divergenceMarker) {
      if (firstDivergenceDisp && ease > 0.5) {
        this.divergenceMarker.visible = true;
        this.divergenceMarker.position.set(firstDivergenceDisp.x, firstDivergenceDisp.y, firstDivergenceDisp.z);
        const s = currentRadius * 1.5;
        this.divergenceMarker.scale.set(s, s, s);
        this.divergenceMarker.rotation.z = this.rotationAngle * 1.2;
        (this.divergenceMarker.material as THREE.LineBasicMaterial).opacity = 0.9 * Math.min(1.0, (ease - 0.5) * 2);
      } else {
        this.divergenceMarker.visible = false;
      }
    }

    // 3. Future Prediction Beads (+T intervals along nominal path)
    const pts = (branchTrajectories[0]?.points || nominalPoints || []);
    const beadInterval = Math.floor(pts.length / (this.maxFutureBeads + 1));

    for (let b = 0; b < this.maxFutureBeads; b++) {
      const bead = this.futureBeadMeshes[b];
      const targetIdx = (b + 1) * beadInterval;
      const beadThreshold = 0.35 + b * 0.15;

      if (targetIdx < pts.length && ease >= beadThreshold) {
        const relPt = this.floatingOrigin.toRelative(pts[targetIdx]);
        const dispPt = this.scaleTransform.getDisplayPosition(relPt);
        const beadScale = currentRadius * (0.8 - b * 0.12);

        bead.visible = true;
        bead.position.set(dispPt.x, dispPt.y, dispPt.z);
        bead.scale.set(beadScale, beadScale, beadScale);
        bead.rotation.y = this.rotationAngle + b;
        bead.rotation.x = this.rotationAngle * 0.5;
        const beadFade = Math.min(1.0, (ease - beadThreshold) * 4);
        const beadTaper = Math.exp(- (b / this.maxFutureBeads) * 1.2);
        (bead.material as THREE.MeshBasicMaterial).opacity = 0.50 * beadTaper * beadFade;
      } else {
        bead.visible = false;
      }
    }
  }

  public clearVisuals(): void {
    for (const mesh of this.echoMeshes) mesh.visible = false;
    for (const bead of this.futureBeadMeshes) bead.visible = false;
    if (this.pastFilamentLine) {
      this.pastFilamentLine.geometry.setDrawRange(0, 0);
    }
    if (this.divergenceMarker) {
      this.divergenceMarker.visible = false;
    }
    for (const [, entry] of this.branchLines) {
      entry.line.geometry.setDrawRange(0, 0);
    }
  }

  /**
   * Complete disposal of all Three.js resources.
   */
  public dispose(): void {
    this.clearVisuals();

    // Dispose THEN
    for (const m of this.echoMeshes) {
      (m.material as THREE.Material).dispose();
      this.thenGroup.remove(m);
    }
    this.echoMeshes = [];

    if (this.pastFilamentLine) {
      this.pastFilamentLine.geometry.dispose();
      (this.pastFilamentLine.material as THREE.Material).dispose();
      this.thenGroup.remove(this.pastFilamentLine);
    }

    // Dispose NOW
    this.nowInnerRing.geometry.dispose();
    (this.nowInnerRing.material as THREE.Material).dispose();
    this.nowCrosshairs.geometry.dispose();
    (this.nowCrosshairs.material as THREE.Material).dispose();

    // Dispose POSSIBLE
    for (const b of this.futureBeadMeshes) {
      (b.material as THREE.Material).dispose();
      this.possibleGroup.remove(b);
    }
    this.futureBeadMeshes = [];

    if (this.divergenceMarker) {
      this.divergenceMarker.geometry.dispose();
      (this.divergenceMarker.material as THREE.Material).dispose();
      this.possibleGroup.remove(this.divergenceMarker);
    }

    for (const [, entry] of this.branchLines) {
      entry.line.geometry.dispose();
      (entry.line.material as THREE.Material).dispose();
      this.possibleGroup.remove(entry.line);
    }
    this.branchLines.clear();

    // Shared geometries
    this.sharedEchoSphereGeo.dispose();
    this.sharedFutureMarkerGeo.dispose();
  }
}
