/**
 * Tablet & Pointer Interaction Manager & Gesture State Machine (#26–#35).
 * 
 * Capabilities:
 * - #26: Focal-point pinch zoom with gesture midpoint tracking
 * - #28: Explicit Gesture State Machine (idle, tap_candidate, camera_orbit, two_finger_nav, body_drag, orbit_draw, pen_hover)
 * - #29: S Pen priority & application-level palm rejection
 * - #31: Double-tap / double-click detection (body focus / system reset)
 * - #34: Desktop trackpad pinch + cursor-centered wheel zoom + middle/right drag pan
 */

export type PointerToolMode = "select" | "grab_throw" | "orbit_loom" | "create";

export type GestureState =
  | "idle"
  | "tap_candidate"
  | "camera_orbit"
  | "two_finger_navigation"
  | "body_drag"
  | "orbit_draw"
  | "pen_hover"
  | "precision_navigation";

export interface NormalizedPointerEvent {
  pointerId: number;
  pointerType: "mouse" | "pen" | "touch";
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  pressure: number;
  isPrimary: boolean;
  rawEvent: PointerEvent;
}

export interface PointerCallbacks {
  onPointerDown: (e: NormalizedPointerEvent) => void;
  onPointerMove: (e: NormalizedPointerEvent) => void;
  onPointerUp: (e: NormalizedPointerEvent) => void;
  onPointerCancel: (e: NormalizedPointerEvent) => void;
  onPointerLeave?: () => void;
  onPinchZoom: (factor: number, center: { x: number; y: number }) => void;
  onTwoFingerPan: (dx: number, dy: number) => void;
  onDoubleTap?: (screenX: number, screenY: number, pointerType: "mouse" | "pen" | "touch") => void;
  onGestureStateChange?: (state: GestureState) => void;
}

export class PointerManager {
  private element: HTMLElement;
  private callbacks: PointerCallbacks;

  // Active pointers tracker
  private activePointers: Map<number, NormalizedPointerEvent> = new Map();
  private prevPositions: Map<number, { clientX: number; clientY: number }> = new Map();
  private startPositions: Map<number, { clientX: number; clientY: number; time: number }> = new Map();

  // Multi-touch tracking (#26)
  private prevPinchDistance: number | null = null;
  private prevPinchCenter: { x: number; y: number } | null = null;

  // Gesture State Machine (#28)
  public currentState: GestureState = "idle";
  private touchSlopPx: number = 8; // Slop threshold for touch
  private penSlopPx: number = 4;   // Tighter threshold for pen/mouse

  // S Pen priority & palm rejection (#29)
  private activePenId: number | null = null;
  private lastPenActiveTime: number = 0;
  private palmRejectionRadiusPx: number = 110;

  // Double tap tracking (#31)
  private lastTapInfo: { x: number; y: number; time: number; pointerType: "mouse" | "pen" | "touch" } | null = null;

  // Manipulation flags
  public isManipulatingObject: boolean = false;
  public isDrawingOrbit: boolean = false;

  constructor(element: HTMLElement, callbacks: PointerCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointercancel", this.handlePointerCancel);
    this.element.addEventListener("pointerleave", this.handlePointerLeave);
    this.element.addEventListener("wheel", this.handleWheel, { passive: false });
    this.element.addEventListener("contextmenu", this.handleContextMenu);
  }

  public destroy(): void {
    this.element.removeEventListener("pointerdown", this.handlePointerDown);
    this.element.removeEventListener("pointermove", this.handlePointerMove);
    this.element.removeEventListener("pointerup", this.handlePointerUp);
    this.element.removeEventListener("pointercancel", this.handlePointerCancel);
    this.element.removeEventListener("pointerleave", this.handlePointerLeave);
    this.element.removeEventListener("wheel", this.handleWheel);
    this.element.removeEventListener("contextmenu", this.handleContextMenu);
  }

  private handleContextMenu = (e: MouseEvent): void => {
    // Prevent default browser context menu on canvas so right-drag pan works smoothly
    e.preventDefault();
  };

  private setState(newState: GestureState): void {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.callbacks.onGestureStateChange?.(newState);
    }
  }

  private normalize(e: PointerEvent, deltaX: number = 0, deltaY: number = 0): NormalizedPointerEvent {
    return {
      pointerId: e.pointerId,
      pointerType: e.pointerType as "mouse" | "pen" | "touch",
      clientX: e.clientX,
      clientY: e.clientY,
      deltaX,
      deltaY,
      pressure: e.pressure,
      isPrimary: e.isPrimary,
      rawEvent: e,
    };
  }

  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  // ==========================================
  // #29 S PEN PRIORITY & PALM REJECTION
  // ==========================================

  private isPalmContact(e: PointerEvent): boolean {
    if (e.pointerType !== "touch") return false;

    const now = performance.now();
    const isPenRecent = (this.activePenId !== null) || (now - this.lastPenActiveTime < 350);

    if (!isPenRecent) return false;

    // Check contact geometry: palm contacts typically have large contact radius
    const radiusX = (e as any).radiusX || 0;
    const radiusY = (e as any).radiusY || 0;
    const isLargeContact = radiusX > 22 || radiusY > 22 || e.width > 35 || e.height > 35;

    // Check distance to active pen position
    if (this.activePenId !== null) {
      const penPos = this.prevPositions.get(this.activePenId);
      if (penPos) {
        const distToPen = Math.hypot(e.clientX - penPos.clientX, e.clientY - penPos.clientY);
        if (distToPen < this.palmRejectionRadiusPx) {
          return true; // Accidental palm resting near pen nib
        }
      }
    }

    return isLargeContact;
  }

  // ==========================================
  // POINTER DOWN
  // ==========================================

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.pointerType === "pen") {
      this.activePenId = e.pointerId;
      this.lastPenActiveTime = performance.now();
    } else if (this.isPalmContact(e)) {
      // Suppress accidental palm touchdown
      return;
    }

    this.prevPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    this.startPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY, time: performance.now() });

    const norm = this.normalize(e, 0, 0);
    this.activePointers.set(e.pointerId, norm);

    try {
      this.element.setPointerCapture(e.pointerId);
    } catch {}

    // Multi-touch transition (2 fingers) -> Two-finger navigation (#26)
    if (this.activePointers.size === 2) {
      if (this.isDrawingOrbit || this.isManipulatingObject) {
        this.isDrawingOrbit = false;
        this.isManipulatingObject = false;
        this.callbacks.onPointerCancel(norm);
      }

      this.setState("two_finger_navigation");
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      this.prevPinchDistance = Math.max(dist, 1.0);
      this.prevPinchCenter = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };
      return;
    }

    if (this.activePointers.size === 1) {
      this.setState("tap_candidate");
    }

    this.callbacks.onPointerDown(norm);
  };

  // ==========================================
  // POINTER MOVE
  // ==========================================

  private handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerType === "pen") {
      this.lastPenActiveTime = performance.now();
      if (e.buttons === 0) {
        this.setState("pen_hover");
      }
    } else if (this.isPalmContact(e)) {
      return;
    }

    const prev = this.prevPositions.get(e.pointerId);
    const deltaX = prev ? e.clientX - prev.clientX : (e.movementX || 0);
    const deltaY = prev ? e.clientY - prev.clientY : (e.movementY || 0);
    this.prevPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const norm = this.normalize(e, deltaX, deltaY);
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, norm);
    }

    // Two-finger pinch zoom & pan (#26)
    if (this.activePointers.size === 2 && !this.isManipulatingObject && !this.isDrawingOrbit) {
      this.setState("two_finger_navigation");
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const center = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      if (this.prevPinchDistance && this.prevPinchDistance > 1.0 && dist > 1.0) {
        const factor = this.prevPinchDistance / dist;
        this.callbacks.onPinchZoom(factor, center);
      }

      if (this.prevPinchCenter) {
        const dx = center.x - this.prevPinchCenter.x;
        const dy = center.y - this.prevPinchCenter.y;
        this.callbacks.onTwoFingerPan(dx, dy);
      }

      this.prevPinchDistance = dist;
      this.prevPinchCenter = center;
      return;
    }

    // Single pointer gesture slop evaluation (#28)
    if (this.currentState === "tap_candidate") {
      const start = this.startPositions.get(e.pointerId);
      if (start) {
        const distMoved = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);
        const slop = e.pointerType === "touch" ? this.touchSlopPx : this.penSlopPx;
        if (distMoved > slop) {
          if (this.isDrawingOrbit) {
            this.setState("orbit_draw");
          } else if (this.isManipulatingObject) {
            this.setState("body_drag");
          } else {
            this.setState("camera_orbit");
          }
        }
      }
    }

    this.callbacks.onPointerMove(norm);
  };

  // ==========================================
  // POINTER UP
  // ==========================================

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.activePenId) {
      this.activePenId = null;
      this.lastPenActiveTime = performance.now();
    }

    const prev = this.prevPositions.get(e.pointerId);
    const deltaX = prev ? e.clientX - prev.clientX : 0;
    const deltaY = prev ? e.clientY - prev.clientY : 0;

    const start = this.startPositions.get(e.pointerId);
    this.prevPositions.delete(e.pointerId);
    this.startPositions.delete(e.pointerId);

    const norm = this.normalize(e, deltaX, deltaY);
    this.activePointers.delete(e.pointerId);

    try {
      this.element.releasePointerCapture(e.pointerId);
    } catch {}

    // Evaluate Tap / Double-tap (#31)
    if (start && this.currentState === "tap_candidate") {
      const dist = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);
      const slop = e.pointerType === "touch" ? this.touchSlopPx : this.penSlopPx;
      const duration = performance.now() - start.time;

      if (dist <= slop && duration < 400) {
        const now = performance.now();
        if (
          this.lastTapInfo &&
          now - this.lastTapInfo.time < 350 &&
          Math.hypot(e.clientX - this.lastTapInfo.x, e.clientY - this.lastTapInfo.y) < 24
        ) {
          // Double-tap detected!
          this.callbacks.onDoubleTap?.(e.clientX, e.clientY, e.pointerType as any);
          this.lastTapInfo = null;
        } else {
          this.lastTapInfo = { x: e.clientX, y: e.clientY, time: now, pointerType: e.pointerType as any };
        }
      }
    }

    if (this.activePointers.size === 0) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.setState("idle");
    } else if (this.activePointers.size === 1) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.setState("camera_orbit");
    }

    this.callbacks.onPointerUp(norm);
  };

  // ==========================================
  // POINTER CANCEL
  // ==========================================

  private handlePointerCancel = (e: PointerEvent): void => {
    if (e.pointerId === this.activePenId) {
      this.activePenId = null;
    }
    this.prevPositions.delete(e.pointerId);
    this.startPositions.delete(e.pointerId);
    const norm = this.normalize(e, 0, 0);
    this.activePointers.delete(e.pointerId);

    if (this.activePointers.size === 0) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.setState("idle");
    }

    this.callbacks.onPointerCancel(norm);
  };

  private handlePointerLeave = (): void => {
    if (this.activePointers.size === 0) {
      this.setState("idle");
    }
    this.callbacks.onPointerLeave?.();
  };

  // ==========================================
  // #34 DESKTOP TRACKPAD & MOUSE WHEEL ZOOM
  // ==========================================

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    let factor = 1.0;
    if (e.ctrlKey) {
      // Trackpad pinch gesture (macOS / Windows Chrome generates wheel + ctrlKey)
      factor = Math.exp(e.deltaY * -0.01);
    } else {
      // Mouse wheel stepped notch
      factor = e.deltaY > 0 ? 1.14 : 0.88;
    }

    this.callbacks.onPinchZoom(factor, { x: e.clientX, y: e.clientY });
  };
}
