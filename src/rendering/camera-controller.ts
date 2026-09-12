/**
 * Comprehensive Camera Controller & Navigation Engine (#26–#41).
 * 
 * Capabilities:
 * - #26: Focal-point pinch & cursor-anchored zoom (preserves world-space anchor under pointer)
 * - #27: Bounded camera inertia & damping for orbit/pan/zoom (no secondary RAF)
 * - #30: Adaptive navigation sensitivity across body and system scale
 * - #32: Interruptible smooth camera transitions (manual input aborts tween immediately)
 * - #33: Frame Selected Body and Frame Entire Orbit
 * - #36: Bounded camera history (undo/redo) and view bookmarks (1–5)
 * - #37: Near-body camera safety (prevents clipping through rendered body geometry)
 * - #38: Precision mode (0.25x scaling for fine adjustments)
 * - #41: Context-aware camera pivot with transient indicator state
 */

import * as THREE from "three";
import { CelestialBody } from "../simulation/types";

export interface CameraSnapshot {
  target: THREE.Vector3;
  distance: number;
  spherical: THREE.Spherical;
  pivotName: string;
}

export interface CameraBookmark {
  slot: number;
  name: string;
  target: { x: number; y: number; z: number };
  distance: number;
  theta: number;
  phi: number;
}

export interface CameraTransition {
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startDistance: number;
  endDistance: number;
  startSpherical: THREE.Spherical;
  endSpherical: THREE.Spherical;
  durationSec: number;
  elapsedSec: number;
  onComplete?: () => void;
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;

  // Core coordinates
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public desiredTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public distance: number = 250.0;
  public spherical: THREE.Spherical = new THREE.Spherical(250, Math.PI / 3, Math.PI / 4);

  // Near-body safety limits
  public minDistance: number = 2.0;
  public maxDistance: number = 18000.0;

  // Precision mode (#38)
  public isPrecisionMode: boolean = false;
  public precisionMultiplier: number = 0.25;

  private bodies: CelestialBody[] = [];

  public setBodies(bodies: CelestialBody[]): void {
    this.bodies = bodies;
  }

  public getBodies(): CelestialBody[] {
    return this.bodies;
  }

  public setPrecisionMode(enabled: boolean): void {
    this.isPrecisionMode = enabled;
  }

  // Inertia & Damping (#27)
  public enableInertia: boolean = true;
  private orbitVelocity = { theta: 0, phi: 0 };
  private panVelocity = new THREE.Vector2(0, 0);
  private zoomVelocity: number = 0;
  private friction: number = 8.5; // Exponential damping rate

  // Interruptible transitions (#32)
  private activeTransition: CameraTransition | null = null;

  public isTransitioning(): boolean {
    return this.activeTransition !== null;
  }

  // History & Bookmarks (#36)
  private history: CameraSnapshot[] = [];
  private historyIndex: number = -1;
  private settledTimer: number = 0;
  private isSettled: boolean = true;
  private bookmarks: Map<number, CameraBookmark> = new Map();

  // Pivot Indicator state (#41)
  public pivotIndicator = {
    position: new THREE.Vector3(0, 0, 0),
    opacity: 0.0,
    visible: false,
  };

  // Reduced motion
  public prefersReducedMotion: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.updateCameraTransform();

    if (typeof window !== "undefined" && window.matchMedia) {
      this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Save initial state in history
    this.pushHistory("Initial View");
  }

  // ==========================================
  // #30 ADAPTIVE SENSITIVITY CALCULATIONS
  // ==========================================

  public getOrbitSensitivity(): number {
    const prec = this.isPrecisionMode ? this.precisionMultiplier : 1.0;
    const scaleFactor = Math.max(0.6, Math.min(1.4, Math.log10(this.distance + 10) / 2.5));
    return 0.0055 * scaleFactor * prec;
  }

  public getPanSensitivity(): number {
    const prec = this.isPrecisionMode ? this.precisionMultiplier : 1.0;
    return this.distance * 0.0013 * prec;
  }

  public getZoomSensitivity(): number {
    return this.isPrecisionMode ? 0.35 : 1.0;
  }

  // ==========================================
  // #28 / #32 USER INPUT INTERRUPT
  // ==========================================

  public interrupt(): void {
    if (this.activeTransition) {
      this.activeTransition = null;
    }
    this.orbitVelocity.theta = 0;
    this.orbitVelocity.phi = 0;
    this.panVelocity.set(0, 0);
    this.zoomVelocity = 0;
    this.isSettled = false;
    this.settledTimer = 0;
  }

  // ==========================================
  // NAVIGATION ACTIONS (ORBIT, PAN, ZOOM)
  // ==========================================

  public orbit(deltaTheta: number, deltaPhi: number): void {
    this.interrupt();

    const prec = this.isPrecisionMode ? this.precisionMultiplier : 1.0;
    const effectiveTheta = deltaTheta * prec;
    const effectivePhi = deltaPhi * prec;

    this.spherical.theta += effectiveTheta;
    this.spherical.phi = Math.max(0.04, Math.min(Math.PI - 0.04, this.spherical.phi + effectivePhi));

    if (this.enableInertia && !this.prefersReducedMotion) {
      this.orbitVelocity.theta = effectiveTheta;
      this.orbitVelocity.phi = effectivePhi;
    }

    this.triggerPivotVisual(this.target);
    this.updateCameraTransform();
  }

  public pan(deltaX: number, deltaY: number): void {
    this.interrupt();

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const sens = this.getPanSensitivity();
    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(right, -deltaX * sens);
    moveVector.addScaledVector(up, deltaY * sens);

    this.desiredTarget.add(moveVector);
    this.target.add(moveVector);

    if (this.enableInertia && !this.prefersReducedMotion) {
      this.panVelocity.set(-deltaX * sens, deltaY * sens);
    }

    this.triggerPivotVisual(this.target);
    this.updateCameraTransform();
  }

  /**
   * #26 GESTURE-CENTERED PINCH AND CURSOR ZOOM.
   * Preserves world-space position under (screenX, screenY) during zoom.
   */
  public zoomAtPoint(
    factor: number,
    screenX: number,
    screenY: number,
    viewportWidth: number,
    viewportHeight: number,
    getAnchorFn?: (ndcX: number, ndcY: number) => THREE.Vector3 | null
  ): void {
    this.interrupt();

    const sens = this.getZoomSensitivity();
    const effectiveFactor = 1.0 + (factor - 1.0) * sens;

    const ndcX = (screenX / viewportWidth) * 2 - 1;
    const ndcY = -(screenY / viewportHeight) * 2 + 1;

    let anchor: THREE.Vector3 | null = null;
    if (getAnchorFn) {
      anchor = getAnchorFn(ndcX, ndcY);
    }

    if (!anchor) {
      const ray = new THREE.Ray();
      ray.origin.copy(this.camera.position);
      const targetDir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera).sub(ray.origin).normalize();
      ray.direction.copy(targetDir);

      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(forward.clone().negate(), this.target);
      const hit = new THREE.Vector3();
      if (ray.intersectPlane(plane, hit)) {
        anchor = hit;
      } else {
        anchor = this.target.clone();
      }
    }

    const prevDist = this.distance;
    const nextDist = Math.max(this.minDistance, Math.min(this.maxDistance, prevDist * effectiveFactor));
    const actualScale = nextDist / prevDist;

    const newTarget = anchor.clone().add(this.target.clone().sub(anchor).multiplyScalar(actualScale));
    this.target.copy(newTarget);
    this.desiredTarget.copy(newTarget);

    this.distance = nextDist;
    this.spherical.radius = nextDist;

    if (this.enableInertia && !this.prefersReducedMotion) {
      this.zoomVelocity = (actualScale - 1.0);
    }

    this.triggerPivotVisual(anchor);
    this.updateCameraTransform();
  }

  public zoom(factor: number): void {
    this.interrupt();
    const sens = this.getZoomSensitivity();
    const effectiveFactor = 1.0 + (factor - 1.0) * sens;

    const nextDist = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * effectiveFactor));
    this.distance = nextDist;
    this.spherical.radius = nextDist;

    if (this.enableInertia && !this.prefersReducedMotion) {
      this.zoomVelocity = (nextDist / this.distance - 1.0);
    }

    this.updateCameraTransform();
  }

  // ==========================================
  // #37 NEAR-BODY CAMERA SAFETY
  // ==========================================

  public setFocusedBodySafety(displayRadius: number): void {
    this.minDistance = Math.max(1.8, displayRadius * 1.6);
    if (this.distance < this.minDistance) {
      this.distance = this.minDistance;
      this.spherical.radius = this.minDistance;
      this.updateCameraTransform();
    }
    this.camera.near = Math.max(0.05, Math.min(2.0, this.minDistance * 0.08));
    this.camera.updateProjectionMatrix();
  }

  public resetSafetyDistance(): void {
    this.minDistance = 2.0;
    this.camera.near = 0.1;
    this.camera.updateProjectionMatrix();
  }

  // ==========================================
  // #32 INTERRUPTIBLE SMOOTH TRANSITIONS
  // ==========================================

  public startTransition(
    targetPos: THREE.Vector3,
    targetDistance: number,
    targetSpherical?: THREE.Spherical,
    durationSec: number = 0.75,
    onComplete?: () => void
  ): void {
    if (this.prefersReducedMotion) {
      this.target.copy(targetPos);
      this.desiredTarget.copy(targetPos);
      this.distance = targetDistance;
      this.spherical.radius = targetDistance;
      if (targetSpherical) {
        this.spherical.theta = targetSpherical.theta;
        this.spherical.phi = targetSpherical.phi;
      }
      this.updateCameraTransform();
      this.pushHistory("Instant Transition");
      onComplete?.();
      return;
    }

    const endSph = targetSpherical
      ? targetSpherical.clone()
      : new THREE.Spherical(targetDistance, this.spherical.phi, this.spherical.theta);

    this.activeTransition = {
      startTarget: this.target.clone(),
      endTarget: targetPos.clone(),
      startDistance: this.distance,
      endDistance: targetDistance,
      startSpherical: this.spherical.clone(),
      endSpherical: endSph,
      durationSec: Math.max(0.2, durationSec),
      elapsedSec: 0,
      onComplete,
    };
  }

  // ==========================================
  // #33 FRAMING COMMANDS (BODY / ORBIT)
  // ==========================================

  public frameBody(bodyPos: THREE.Vector3, displayRadius: number, durationSec: number = 0.65): void {
    this.setFocusedBodySafety(displayRadius);
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const fitDistance = Math.max(this.minDistance, (displayRadius * 1.3) / Math.sin(fovRad / 2));
    this.startTransition(bodyPos, fitDistance, undefined, durationSec, () => {
      this.pushHistory("Frame Body");
    });
  }

  public frameOrbit(primaryPos: THREE.Vector3, secondaryPos: THREE.Vector3, apoapsisDispDist: number): void {
    const mid = new THREE.Vector3().addVectors(primaryPos, secondaryPos).multiplyScalar(0.5);
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const fitDistance = Math.max(120.0, (apoapsisDispDist * 1.4) / Math.sin(fovRad / 2));
    const topSpherical = new THREE.Spherical(fitDistance, Math.PI / 3.5, this.spherical.theta);
    this.startTransition(mid, fitDistance, topSpherical, 0.8, () => {
      this.pushHistory("Frame Orbit");
    });
  }

  public resetSystemView(): void {
    this.resetSafetyDistance();
    const defaultSph = new THREE.Spherical(280.0, Math.PI / 3, Math.PI / 4);
    this.startTransition(new THREE.Vector3(0, 0, 0), 280.0, defaultSph, 0.7, () => {
      this.pushHistory("Reset System View");
    });
  }

  public setCardinalView(view: "top" | "front" | "side" | "isometric"): void {
    let phi = Math.PI / 3;
    let theta = Math.PI / 4;

    switch (view) {
      case "top":
        phi = 0.05;
        break;
      case "front":
        phi = Math.PI / 2;
        theta = 0;
        break;
      case "side":
        phi = Math.PI / 2;
        theta = Math.PI / 2;
        break;
      case "isometric":
        phi = Math.PI / 3;
        theta = Math.PI / 4;
        break;
    }

    const sph = new THREE.Spherical(this.distance, phi, theta);
    this.startTransition(this.target, this.distance, sph, 0.6, () => {
      this.pushHistory("View: " + view);
    });
  }

  // ==========================================
  // #36 CAMERA HISTORY & BOOKMARKS
  // ==========================================

  public pushHistory(pivotName: string = "Camera View"): void {
    const snap: CameraSnapshot = {
      target: this.target.clone(),
      distance: this.distance,
      spherical: this.spherical.clone(),
      pivotName,
    };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snap);
    if (this.history.length > 15) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  public canUndo(): boolean {
    return this.historyIndex > 0;
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  public undo(): boolean {
    if (!this.canUndo()) return false;
    this.historyIndex--;
    const snap = this.history[this.historyIndex];
    this.applySnapshot(snap);
    return true;
  }

  public redo(): boolean {
    if (!this.canRedo()) return false;
    this.historyIndex++;
    const snap = this.history[this.historyIndex];
    this.applySnapshot(snap);
    return true;
  }

  private applySnapshot(snap: CameraSnapshot): void {
    this.startTransition(snap.target, snap.distance, snap.spherical, 0.55);
  }

  public setBookmark(slot: number, name?: string): CameraBookmark {
    const bm: CameraBookmark = {
      slot,
      name: name || "Bookmark " + slot,
      target: { x: this.target.x, y: this.target.y, z: this.target.z },
      distance: this.distance,
      theta: this.spherical.theta,
      phi: this.spherical.phi,
    };
    this.bookmarks.set(slot, bm);
    return bm;
  }

  public getBookmark(slot: number): CameraBookmark | undefined {
    return this.bookmarks.get(slot);
  }

  public loadBookmark(slot: number): boolean {
    const bm = this.bookmarks.get(slot);
    if (!bm) return false;
    const tgt = new THREE.Vector3(bm.target.x, bm.target.y, bm.target.z);
    const sph = new THREE.Spherical(bm.distance, bm.phi, bm.theta);
    this.startTransition(tgt, bm.distance, sph, 0.65, () => {
      this.pushHistory(bm.name);
    });
    return true;
  }

  public getAllBookmarks(): CameraBookmark[] {
    return Array.from(this.bookmarks.values()).sort((a, b) => a.slot - b.slot);
  }

  // ==========================================
  // #41 TRANSIENT PIVOT INDICATOR
  // ==========================================

  private triggerPivotVisual(point: THREE.Vector3): void {
    this.pivotIndicator.position.copy(point);
    this.pivotIndicator.opacity = 0.85;
    this.pivotIndicator.visible = true;
  }

  // ==========================================
  // MASTER UPDATE CYCLE
  // ==========================================

  public update(deltaSec: number): void {
    if (this.activeTransition) {
      const trans = this.activeTransition;
      trans.elapsedSec += deltaSec;
      const progress = Math.min(1.0, trans.elapsedSec / trans.durationSec);
      const t = 1.0 - Math.pow(1.0 - progress, 3);

      this.target.lerpVectors(trans.startTarget, trans.endTarget, t);
      this.desiredTarget.copy(this.target);

      this.distance = THREE.MathUtils.lerp(trans.startDistance, trans.endDistance, t);
      this.spherical.radius = this.distance;
      this.spherical.theta = THREE.MathUtils.lerp(trans.startSpherical.theta, trans.endSpherical.theta, t);
      this.spherical.phi = THREE.MathUtils.lerp(trans.startSpherical.phi, trans.endSpherical.phi, t);

      this.updateCameraTransform();

      if (progress >= 1.0) {
        const cb = trans.onComplete;
        this.activeTransition = null;
        cb?.();
      }
      return;
    }

    if (this.enableInertia && !this.prefersReducedMotion) {
      const decay = Math.exp(-this.friction * deltaSec);

      if (Math.abs(this.orbitVelocity.theta) > 0.00005 || Math.abs(this.orbitVelocity.phi) > 0.00005) {
        this.spherical.theta += this.orbitVelocity.theta;
        this.spherical.phi = Math.max(0.04, Math.min(Math.PI - 0.04, this.spherical.phi + this.orbitVelocity.phi));
        this.orbitVelocity.theta *= decay;
        this.orbitVelocity.phi *= decay;
      }

      if (this.panVelocity.lengthSq() > 0.0001) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const panMove = new THREE.Vector3()
          .addScaledVector(right, this.panVelocity.x)
          .addScaledVector(up, this.panVelocity.y);

        this.target.add(panMove);
        this.desiredTarget.copy(this.target);
        this.panVelocity.multiplyScalar(decay);
      }

      if (Math.abs(this.zoomVelocity) > 0.0001) {
        const nextDist = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * (1.0 + this.zoomVelocity)));
        this.distance = nextDist;
        this.spherical.radius = nextDist;
        this.zoomVelocity *= decay;
      }
    }

    this.target.lerp(this.desiredTarget, Math.min(1.0, deltaSec * 10.0));
    this.updateCameraTransform();

    if (this.pivotIndicator.visible) {
      this.pivotIndicator.opacity -= deltaSec * 1.8;
      if (this.pivotIndicator.opacity <= 0) {
        this.pivotIndicator.opacity = 0;
        this.pivotIndicator.visible = false;
      }
    }

    if (!this.isSettled) {
      this.settledTimer += deltaSec;
      if (this.settledTimer > 0.45) {
        this.isSettled = true;
        this.pushHistory("View Settled");
      }
    }
  }

  public updateCameraTransform(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
