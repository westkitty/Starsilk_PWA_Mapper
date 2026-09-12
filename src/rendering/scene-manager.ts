/**
 * Master Scene Manager and Three.js Render Pipeline.
 *
 * Orchestrates the renderer, celestial presentation, camera/navigation,
 * orbital instrumentation, semantic zoom, and non-mutating smart labels.
 */

import * as THREE from 'three';
import { CelestialBody, Vector3D } from '../simulation/types';
import { FloatingOrigin } from './floating-origin';
import { ScaleTransform } from './scale-transform';
import {
  createStarMaterial,
  createCoronaMaterial,
  createBlackHoleMaterial,
  createAccretionDiskMaterial,
  createPlanetMaterial,
  createGasGiantMaterial,
  createBloodRingMaterial,
  createOrdinaryRingMaterial,
} from './celestial-shaders';
import { TrajectoryRenderer } from './trajectory-renderer';
import { GravityGridRenderer } from './gravity-grid';
import { FateLensRenderer } from './fate-lens-renderer';
import { StarfieldRenderer } from './starfield-renderer';
import { KeplerianOverlay } from './keplerian-overlay';
import { OrbitalBoundsOverlay } from './orbital-bounds-overlay';
import { LagrangeOverlay } from './lagrange-overlay';
import { CollapsePresentation } from './collapse-presentation';
import { CameraController } from './camera-controller';
import { PivotIndicator } from './pivot-indicator';
import { VectorOverlay } from './vector-overlay';
import { EncounterOverlay } from './encounter-overlay';
import { OrbitalPlaneGizmo } from './orbital-plane-gizmo';
import {
  SmartBodyLabels,
  SmartLabelCandidate,
  SemanticLodTier,
  layoutSmartLabels,
  resolveSemanticLod,
} from '../ui/smart-body-labels';

export type CameraViewMode = 'inertial' | 'focus_selected' | 'follow_selected' | 'top_down';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public floatingOrigin: FloatingOrigin;
  public scaleTransform: ScaleTransform;
  public trajectoryRenderer: TrajectoryRenderer;
  public gravityGrid: GravityGridRenderer;
  public fateLensRenderer: FateLensRenderer;
  public starfieldRenderer: StarfieldRenderer;
  public keplerianOverlay: KeplerianOverlay;
  public orbitalBoundsOverlay: OrbitalBoundsOverlay;
  public lagrangeOverlay: LagrangeOverlay;
  public collapsePresentation: CollapsePresentation;
  public cameraController: CameraController;
  public pivotIndicator: PivotIndicator;
  public vectorOverlay: VectorOverlay;
  public encounterOverlay: EncounterOverlay;
  public orbitalPlaneGizmo: OrbitalPlaneGizmo;
  public smartBodyLabels: SmartBodyLabels;

  private bodyMeshes: Map<string, THREE.Group> = new Map();
  private latestBodies: CelestialBody[] = [];

  public viewMode: CameraViewMode = 'inertial';
  public selectedBodyId: string | null = null;
  public cameraTarget = new THREE.Vector3(0, 0, 0);
  private desiredTarget = new THREE.Vector3(0, 0, 0);
  public cameraDistance: number = 250.0;
  private cameraSpherical = new THREE.Spherical(250, Math.PI / 3, Math.PI / 4);

  private clock = new THREE.Clock();
  private semanticLodTier: SemanticLodTier = 'detail';
  private labelUpdateAccumulator = 0;
  private readonly labelUpdateIntervalSec = 0.1;
  private hoveredBodyId: string | null = null;
  private projectionScratch = new THREE.Vector3();

  private handleLabelPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.hoveredBodyId = null;
      return;
    }
    if (e.buttons !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const tolerance = e.pointerType === 'pen' ? 14 : 18;
    this.hoveredBodyId = this.findHoverBodyAtNdc(ndcX, ndcY, tolerance);
  };

  private handleLabelPointerLeave = (): void => {
    this.hoveredBodyId = null;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.floatingOrigin = new FloatingOrigin();
    this.scaleTransform = new ScaleTransform();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#03050a');

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 50000);
    this.cameraController = new CameraController(this.camera);
    this.cameraTarget = this.cameraController.target;

    this.pivotIndicator = new PivotIndicator();
    this.scene.add(this.pivotIndicator.getGroup());
    this.vectorOverlay = new VectorOverlay(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.vectorOverlay.getGroup());
    this.encounterOverlay = new EncounterOverlay(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.encounterOverlay.getGroup());
    this.orbitalPlaneGizmo = new OrbitalPlaneGizmo(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.orbitalPlaneGizmo.getGroup());
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.smartBodyLabels = new SmartBodyLabels(canvas);
    canvas.addEventListener('pointermove', this.handleLabelPointerMove, { passive: true });
    canvas.addEventListener('pointerleave', this.handleLabelPointerLeave);

    const ambient = new THREE.AmbientLight('#111827', 0.8);
    this.scene.add(ambient);

    this.trajectoryRenderer = new TrajectoryRenderer(
      this.scaleTransform,
      canvas.clientWidth || 1280,
      canvas.clientHeight || 800
    );
    this.scene.add(this.trajectoryRenderer.getGroup());

    this.keplerianOverlay = new KeplerianOverlay(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.keplerianOverlay.getGroup());

    this.orbitalBoundsOverlay = new OrbitalBoundsOverlay(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.orbitalBoundsOverlay.getGroup());

    this.lagrangeOverlay = new LagrangeOverlay(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.lagrangeOverlay.getGroup());

    this.gravityGrid = new GravityGridRenderer(this.scaleTransform);
    this.scene.add(this.gravityGrid.getMesh());

    this.fateLensRenderer = new FateLensRenderer(this.scaleTransform, this.floatingOrigin);
    this.scene.add(this.fateLensRenderer.getGroup());

    this.starfieldRenderer = new StarfieldRenderer(this.renderer.getPixelRatio());
    this.scene.add(this.starfieldRenderer.getGroup());
    this.starfieldRenderer.update(this.camera);

    this.collapsePresentation = new CollapsePresentation();
    this.scene.add(this.collapsePresentation.getGroup());

    this.applySemanticLodVisibility();
  }

  /** Synchronize 3D meshes with authoritative simulation bodies. */
  public syncBodies(bodies: CelestialBody[]): void {
    this.latestBodies = bodies;
    const activeIds = new Set(bodies.map(b => b.id));

    for (const [id, group] of this.bodyMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(group);
        this.disposeGroup(group);
        this.bodyMeshes.delete(id);
      }
    }

    if (this.selectedBodyId && (this.viewMode === 'focus_selected' || this.viewMode === 'follow_selected')) {
      const selected = bodies.find(b => b.id === this.selectedBodyId);
      if (selected) {
        this.floatingOrigin.setOrigin(selected.position.x, selected.position.y, selected.position.z);
        this.desiredTarget.set(0, 0, 0);
      }
    } else {
      this.floatingOrigin.setOrigin(0, 0, 0);
    }

    const primaryStar = bodies.find(b => b.type === 'star') || bodies[0];

    for (const b of bodies) {
      let group = this.bodyMeshes.get(b.id);

      if (group && (group.userData.type !== b.type || group.userData.classification !== b.classification)) {
        this.scene.remove(group);
        this.disposeGroup(group);
        this.bodyMeshes.delete(b.id);
        group = undefined;
      }

      if (!group) {
        group = this.createBodyMesh(b);
        this.bodyMeshes.set(b.id, group);
        this.scene.add(group);
      }

      const relPos = this.floatingOrigin.toRelative(b.position);
      const dispPos = this.scaleTransform.getDisplayPosition(relPos);
      group.position.set(dispPos.x, dispPos.y, dispPos.z);

      const dispRadius = this.scaleTransform.getDisplayRadius(b.radiusKm, b.type);
      const coreMesh = group.getObjectByName('core') as THREE.Mesh;
      if (coreMesh) {
        if (!this.collapsePresentation.isActive() || this.collapsePresentation.getTargetBodyId() !== b.id) {
          coreMesh.scale.set(dispRadius, dispRadius, dispRadius);
        }

        if (coreMesh.material instanceof THREE.ShaderMaterial) {
          if (coreMesh.material.uniforms.uTime) {
            coreMesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
          }
          if (coreMesh.material.uniforms.uStarsilkBleed) {
            coreMesh.material.uniforms.uStarsilkBleed.value = b.starsilkBleed || 0;
          }
          if (coreMesh.material.uniforms.uLightDir && primaryStar && primaryStar.id !== b.id) {
            const lDir = new THREE.Vector3().subVectors(primaryStar.position, b.position).normalize();
            coreMesh.material.uniforms.uLightDir.value.copy(lDir);
          }
        }
      }

      const coronaMesh = group.getObjectByName('corona') as THREE.Mesh;
      if (coronaMesh) {
        coronaMesh.scale.set(dispRadius, dispRadius, dispRadius);
        if (coronaMesh.material instanceof THREE.ShaderMaterial) {
          if (coronaMesh.material.uniforms.uTime) {
            coronaMesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
          }
          if (coronaMesh.material.uniforms.uStarsilkBleed) {
            coronaMesh.material.uniforms.uStarsilkBleed.value = b.starsilkBleed || 0;
          }
        }
      }

      let diskMesh = group.getObjectByName('accretionDisk') as THREE.Mesh;
      if (b.type === 'black_hole' && b.hasAccretionDisk) {
        if (!diskMesh) {
          const diskGeo = new THREE.RingGeometry(1.5, 4.0, 64);
          const diskMat = createAccretionDiskMaterial();
          diskMesh = new THREE.Mesh(diskGeo, diskMat);
          diskMesh.name = 'accretionDisk';
          diskMesh.rotation.x = Math.PI / 2;
          group.add(diskMesh);
        }
        diskMesh.scale.set(dispRadius, dispRadius, dispRadius);
        if (diskMesh.material instanceof THREE.ShaderMaterial && diskMesh.material.uniforms.uTime) {
          diskMesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
        }
      } else if (diskMesh) {
        group.remove(diskMesh);
        diskMesh.geometry.dispose();
        if (Array.isArray(diskMesh.material)) diskMesh.material.forEach(m => m.dispose());
        else diskMesh.material.dispose();
      }

      if (b.rings && b.rings.length > 0) {
        this.updateBodyRings(b, group, dispRadius, primaryStar);
      }

      this.applyBodyLodVisibility(group, b.id === this.selectedBodyId);
    }

    this.gravityGrid.update(bodies);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  private createBodyMesh(b: CelestialBody): THREE.Group {
    const group = new THREE.Group();
    group.name = `body-${b.id}`;
    group.userData.type = b.type;
    group.userData.classification = b.classification;

    let coreMesh: THREE.Mesh;
    const sphereGeo = new THREE.SphereGeometry(1, 32, 24);

    if (b.type === 'black_hole') {
      coreMesh = new THREE.Mesh(sphereGeo, createBlackHoleMaterial());
      if (b.hasAccretionDisk) {
        const diskGeo = new THREE.RingGeometry(1.5, 4.0, 64);
        const diskMesh = new THREE.Mesh(diskGeo, createAccretionDiskMaterial());
        diskMesh.name = 'accretionDisk';
        diskMesh.rotation.x = Math.PI / 2;
        group.add(diskMesh);
      }
    } else if (b.type === 'star') {
      coreMesh = new THREE.Mesh(sphereGeo, createStarMaterial(b.color, b.starsilkBleed));
      const coronaMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 32, 24),
        createCoronaMaterial(b.color, b.starsilkBleed)
      );
      coronaMesh.name = 'corona';
      group.add(coronaMesh);
    } else if (b.classification === 'gas_giant') {
      coreMesh = new THREE.Mesh(sphereGeo, createGasGiantMaterial(b.color, b.atmosphereColor));
    } else {
      coreMesh = new THREE.Mesh(sphereGeo, createPlanetMaterial(b.color, b.atmosphereColor));
    }

    coreMesh.name = 'core';
    group.add(coreMesh);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.3, 32),
      new THREE.MeshBasicMaterial({
        color: '#0cc6ff',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    halo.name = 'selectionHalo';
    halo.rotation.x = Math.PI / 2;
    halo.visible = false;
    group.add(halo);

    return group;
  }

  private updateBodyRings(b: CelestialBody, group: THREE.Group, dispRadius: number, primaryStar?: CelestialBody): void {
    const ringIds = new Set((b.rings || []).map(r => `ring-${r.id}`));
    const toRemove: THREE.Object3D[] = [];
    group.children.forEach(child => {
      if (child.name.startsWith('ring-') && !ringIds.has(child.name)) toRemove.push(child);
    });

    for (const obj of toRemove) {
      group.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const lightDir = new THREE.Vector3(1, 0, 0);
    if (primaryStar && primaryStar.id !== b.id) {
      lightDir.subVectors(primaryStar.position, b.position).normalize();
    }

    for (const ring of b.rings || []) {
      let ringMesh = group.getObjectByName(`ring-${ring.id}`) as THREE.Mesh;
      if (!ringMesh) {
        const geo = new THREE.RingGeometry(1.4, 2.4, 64);
        const mat = ring.isBloodRing ? createBloodRingMaterial(1.0) : createOrdinaryRingMaterial(ring.color, 1.0);
        ringMesh = new THREE.Mesh(geo, mat);
        ringMesh.name = `ring-${ring.id}`;
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);
      }
      ringMesh.scale.set(dispRadius, dispRadius, dispRadius);
      if (ringMesh.material instanceof THREE.ShaderMaterial) {
        if (ringMesh.material.uniforms.uLightDir) ringMesh.material.uniforms.uLightDir.value.copy(lightDir);
        if (ringMesh.material.uniforms.uTime) ringMesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
      }
    }
  }

  public setSelectedBody(id: string | null): void {
    this.selectedBodyId = id;
    this.fateLensRenderer.setTargetBody(id);
    if (!id) {
      this.keplerianOverlay.clear();
      this.orbitalBoundsOverlay.clear();
      this.lagrangeOverlay.clear();
    }
    for (const [bodyId, group] of this.bodyMeshes) {
      const halo = group.getObjectByName('selectionHalo');
      if (halo) halo.visible = bodyId === id;
      this.applyBodyLodVisibility(group, bodyId === id);
    }
    this.applySemanticLodVisibility();
  }

  public setFateLensActive(active: boolean): void {
    this.fateLensRenderer.setActive(active);
    if (this.selectedBodyId) this.fateLensRenderer.setTargetBody(this.selectedBodyId);
  }

  public isFateLensActive(): boolean {
    return this.fateLensRenderer.getIsActive();
  }

  public getSemanticLodTier(): SemanticLodTier {
    return this.semanticLodTier;
  }

  private applyBodyLodVisibility(group: THREE.Group, selected: boolean): void {
    const keepFineDetail = this.semanticLodTier !== 'system' || selected;
    for (const child of group.children) {
      if (child.name === 'corona' || child.name === 'accretionDisk' || child.name.startsWith('ring-')) {
        child.visible = keepFineDetail;
      }
    }
  }

  private applySemanticLodVisibility(): void {
    const showContext = this.semanticLodTier !== 'system';
    const showDetail = this.semanticLodTier === 'detail';

    // Fate Lens and trajectories remain untouched: they are primary analytical context.
    this.keplerianOverlay.getGroup().visible = showContext;
    this.orbitalBoundsOverlay.getGroup().visible = showContext;
    this.encounterOverlay.getGroup().visible = showContext;
    this.lagrangeOverlay.getGroup().visible = showDetail;
    this.vectorOverlay.getGroup().visible = showDetail;
    this.orbitalPlaneGizmo.getGroup().visible = showDetail;

    for (const [id, group] of this.bodyMeshes) {
      this.applyBodyLodVisibility(group, id === this.selectedBodyId);
    }
  }

  private updateSemanticLod(): void {
    const next = resolveSemanticLod(this.cameraDistance, this.semanticLodTier);
    if (next === this.semanticLodTier) return;
    this.semanticLodTier = next;
    this.applySemanticLodVisibility();
  }

  private findHoverBodyAtNdc(normalizedX: number, normalizedY: number, tolerancePx: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const pointerX = (normalizedX * 0.5 + 0.5) * rect.width;
    const pointerY = (-(normalizedY * 0.5) + 0.5) * rect.height;

    let bestId: string | null = null;
    let bestDistance = tolerancePx;
    this.camera.updateMatrixWorld();

    for (const [id, group] of this.bodyMeshes) {
      this.projectionScratch.copy(group.position).project(this.camera);
      if (this.projectionScratch.z < -1 || this.projectionScratch.z > 1) continue;
      const x = (this.projectionScratch.x * 0.5 + 0.5) * rect.width;
      const y = (-(this.projectionScratch.y * 0.5) + 0.5) * rect.height;
      const distance = Math.hypot(x - pointerX, y - pointerY);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestId = id;
      }
    }

    return bestId;
  }

  private updateSmartLabels(): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || this.latestBodies.length === 0) {
      this.smartBodyLabels.clear();
      return;
    }

    const primary = this.latestBodies.find(b => b.type === 'star') || this.latestBodies[0];
    const candidates: SmartLabelCandidate[] = [];
    this.camera.updateMatrixWorld();

    for (const body of this.latestBodies) {
      const group = this.bodyMeshes.get(body.id);
      if (!group) continue;
      this.projectionScratch.copy(group.position).project(this.camera);
      const ndcX = this.projectionScratch.x;
      const ndcY = this.projectionScratch.y;
      const ndcZ = this.projectionScratch.z;
      if (ndcZ < -1 || ndcZ > 1 || Math.abs(ndcX) > 1.04 || Math.abs(ndcY) > 1.04) continue;

      const selected = body.id === this.selectedBodyId;
      const hovered = body.id === this.hoveredBodyId;
      const isPrimary = body.id === primary?.id;
      let priority = 20;
      if (body.type === 'black_hole') priority = 55;
      else if (body.type === 'star') priority = 50;
      if (isPrimary) priority = 80;
      if (hovered) priority = 90;
      if (selected) priority = 100;

      candidates.push({
        id: body.id,
        name: body.name,
        x: (ndcX * 0.5 + 0.5) * rect.width,
        y: (-(ndcY * 0.5) + 0.5) * rect.height,
        depth: this.camera.position.distanceTo(group.position),
        priority,
        selected,
        hovered,
        primary: isPrimary,
      });
    }

    const maxLabels = this.semanticLodTier === 'detail' ? 12 : this.semanticLodTier === 'context' ? 8 : 5;
    this.smartBodyLabels.update(layoutSmartLabels(candidates, rect.width, rect.height, maxLabels));
  }

  public orbitCamera(deltaTheta: number, deltaPhi: number): void {
    this.cameraController.orbit(deltaTheta, deltaPhi);
  }

  public zoomCamera(factor: number): void {
    this.cameraController.zoom(factor);
  }

  public zoomCameraAtPoint(factor: number, screenX: number, screenY: number, width: number, height: number): void {
    this.cameraController.zoomAtPoint(factor, screenX, screenY, width, height, (ndcX: number, ndcY: number) =>
      this.getSurfaceAnchorAtNdc(ndcX, ndcY)
    );
  }

  public panCamera(deltaX: number, deltaY: number, _width?: number, _height?: number): void {
    this.cameraController.pan(deltaX, deltaY);
  }

  public setViewMode(mode: CameraViewMode): void {
    this.viewMode = mode;
    if (mode === 'top_down') this.cameraController.setCardinalView('top');
    else this.cameraController.setCardinalView('isometric');
  }

  public frameBody(bodyId: string, durationSec: number = 0.75): void {
    const group = this.bodyMeshes.get(bodyId);
    if (group) {
      const core = group.getObjectByName('core') as THREE.Mesh;
      const radius = core ? Math.max(2.0, core.scale.x) : 5.0;
      this.cameraController.frameBody(group.position, radius, durationSec);
    }
  }

  public frameOrbit(bodyId: string, primaryId?: string): void {
    const group = this.bodyMeshes.get(bodyId);
    if (!group) return;
    const primGroup = primaryId ? this.bodyMeshes.get(primaryId) : null;
    const primPos = primGroup ? primGroup.position : new THREE.Vector3(0, 0, 0);
    const dist = primPos.distanceTo(group.position);
    this.cameraController.frameOrbit(primPos, group.position, Math.max(50, dist));
  }

  public resetSystemView(): void {
    this.cameraController.resetSystemView();
  }

  public getSurfaceAnchorAtNdc(ndcX: number, ndcY: number): THREE.Vector3 | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const candidates: THREE.Mesh[] = [];
    for (const [, group] of this.bodyMeshes) {
      const core = group.getObjectByName('core') as THREE.Mesh;
      if (core) candidates.push(core);
    }
    const hits = raycaster.intersectObjects(candidates, false);
    if (hits.length > 0 && hits[0].point) return hits[0].point;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, planeHit)) return planeHit;
    return null;
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.cameraSpherical);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
    this.starfieldRenderer?.update(this.camera);
  }

  public update(deltaSec: number): void {
    this.cameraController.update(deltaSec);
    this.cameraTarget.copy(this.cameraController.target);
    this.cameraDistance = this.cameraController.distance;
    this.cameraSpherical.copy(this.cameraController.spherical);
    this.starfieldRenderer?.update(this.camera);

    this.updateSemanticLod();

    if (this.pivotIndicator && this.cameraController.pivotIndicator) {
      this.pivotIndicator.update(
        this.cameraController.pivotIndicator.position,
        this.cameraController.pivotIndicator.opacity,
        this.camera
      );
    }

    this.scaleTransform.update(deltaSec);
    this.trajectoryRenderer.update(deltaSec);

    this.labelUpdateAccumulator += deltaSec;
    if (this.labelUpdateAccumulator >= this.labelUpdateIntervalSec) {
      this.labelUpdateAccumulator %= this.labelUpdateIntervalSec;
      this.updateSmartLabels();
    }

    if (this.collapsePresentation.isActive()) {
      const targetId = this.collapsePresentation.getTargetBodyId();
      const targetGroup = targetId ? this.bodyMeshes.get(targetId) || null : null;
      this.collapsePresentation.update(deltaSec, targetGroup);
    }
  }

  public playCollapseSequence(bodyId: string, onComplete?: () => void): void {
    const group = this.bodyMeshes.get(bodyId);
    const targetPos = group ? group.position.clone() : new THREE.Vector3();
    const core = group?.getObjectByName('core') as THREE.Mesh | undefined;
    const initialR = core ? core.scale.x : 10;
    this.collapsePresentation.start({ targetPos, initialRadius: initialR, onComplete }, bodyId);
    this.gravityGrid.triggerEventRipple(targetPos.x, targetPos.z, 1.8);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.starfieldRenderer?.setPixelRatio(this.renderer.getPixelRatio());
    this.trajectoryRenderer.setResolution(width, height);
    this.updateSmartLabels();
  }

  private lastPickCoords: { x: number; y: number } | null = null;
  private lastPickCycleIndex: number = 0;

  /**
   * Raycast or screen-space tolerance pick celestial bodies (#39).
   * Supports touch tolerance radius and multi-tap cycling for overlapping clusters.
   */
  public raycastBody(normalizedX: number, normalizedY: number, screenPixelTolerance: number = 28): string | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);

    const candidates: { id: string; mesh: THREE.Mesh }[] = [];
    for (const [id, group] of this.bodyMeshes) {
      const core = group.getObjectByName('core') as THREE.Mesh;
      if (core) candidates.push({ id, mesh: core });
    }

    const intersects = raycaster.intersectObjects(candidates.map(c => c.mesh), false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const found = candidates.find(c => c.mesh === hit);
      if (found) return found.id;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const clickScreenX = (normalizedX * 0.5 + 0.5) * rect.width;
    const clickScreenY = (-(normalizedY * 0.5) + 0.5) * rect.height;
    const proximityMatches: { id: string; distancePx: number }[] = [];

    for (const [id] of this.bodyMeshes) {
      const screenPos = this.getBodyScreenPosition(id);
      if (!screenPos) continue;
      const relX = screenPos.x - rect.left;
      const relY = screenPos.y - rect.top;
      const dist = Math.hypot(relX - clickScreenX, relY - clickScreenY);
      if (dist <= screenPixelTolerance) proximityMatches.push({ id, distancePx: dist });
    }

    if (proximityMatches.length === 0) {
      this.lastPickCoords = null;
      this.lastPickCycleIndex = 0;
      return null;
    }

    proximityMatches.sort((a, b) => a.distancePx - b.distancePx);
    const isConsecutiveTap =
      this.lastPickCoords &&
      Math.hypot(this.lastPickCoords.x - clickScreenX, this.lastPickCoords.y - clickScreenY) < 16;

    let chosenIndex = 0;
    if (isConsecutiveTap) {
      this.lastPickCycleIndex = (this.lastPickCycleIndex + 1) % proximityMatches.length;
      chosenIndex = this.lastPickCycleIndex;
    } else {
      this.lastPickCycleIndex = 0;
    }

    this.lastPickCoords = { x: clickScreenX, y: clickScreenY };
    return proximityMatches[chosenIndex].id;
  }

  public getBodyScreenPosition(bodyId: string): { x: number; y: number } | null {
    const group = this.bodyMeshes.get(bodyId);
    if (!group) return null;
    this.camera.updateMatrixWorld();
    group.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    group.getWorldPosition(p);
    p.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (p.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-(p.y * 0.5) + 0.5) * rect.height + rect.top,
    };
  }

  public raycastOrbitalPlane(normalizedX: number, normalizedY: number, planeY: number = 0): Vector3D | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);
    if (hit) return { x: hit.x, y: hit.y, z: hit.z };
    return null;
  }

  public dispose(): void {
    this.renderer.domElement.removeEventListener('pointermove', this.handleLabelPointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handleLabelPointerLeave);
    this.smartBodyLabels.dispose();
    this.pivotIndicator.dispose();
    this.vectorOverlay.dispose();
    this.encounterOverlay.dispose();
    this.orbitalPlaneGizmo.dispose();
    this.starfieldRenderer?.dispose();
    if (this.starfieldRenderer) this.scene.remove(this.starfieldRenderer.getGroup());
    this.fateLensRenderer.dispose();
    this.keplerianOverlay.dispose();
    this.orbitalBoundsOverlay.dispose();
    this.lagrangeOverlay.dispose();
    this.trajectoryRenderer.dispose();
    this.collapsePresentation.dispose();
    for (const [, group] of this.bodyMeshes) {
      this.scene.remove(group);
      this.disposeGroup(group);
    }
    this.bodyMeshes.clear();
    this.renderer.dispose();
  }
}
