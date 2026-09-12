/**
 * Unified pointer and gesture router for desktop, touch, and S Pen navigation.
 *
 * Desktop navigation follows the proven Parable hand-feel grammar:
 * - plain LMB drag -> pan after a 10 px click/drag threshold
 * - MMB drag -> orbit
 * - Shift+LMB or Alt+LMB -> orbit fallback
 * - wheel / trackpad pinch -> cursor-centered zoom
 *
 * Tablet navigation keeps the established Starsilk contract:
 * - one finger -> orbit after touch slop
 * - two fingers -> focal pinch zoom + simultaneous pan
 * - S Pen -> hover/construct/manipulate when a tool owns the pointer; otherwise
 *   plain pen drag pans and barrel-button drag orbits
 * - recent pen activity suppresses likely palm contacts
 */

export type PointerToolMode = 'select' | 'grab_throw' | 'orbit_loom' | 'create';

export type GestureState =
  | 'idle'
  | 'tap_candidate'
  | 'camera_pan'
  | 'camera_orbit'
  | 'two_finger_navigation'
  | 'body_drag'
  | 'orbit_draw'
  | 'pen_hover'
  | 'precision_navigation';

export interface NormalizedPointerEvent {
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
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
  onDoubleTap?: (screenX: number, screenY: number, pointerType: 'mouse' | 'pen' | 'touch') => void;
  onGestureStateChange?: (state: GestureState) => void;
}

export type NavigationPressMode = 'pan_candidate' | 'orbit' | 'touch_orbit' | 'tool_or_click' | 'none';

const PARABLE_MOUSE_DRAG_THRESHOLD_PX = 10;
const TOUCH_SLOP_PX = 8;
const PEN_SLOP_PX = 5;
const PARABLE_ORBIT_DELTA_SCALE = 0.6;

export function resolveNavigationPressMode(
  pointerType: 'mouse' | 'pen' | 'touch',
  button: number,
  buttons: number,
  altKey: boolean,
  shiftKey: boolean
): NavigationPressMode {
  if (pointerType === 'touch') return 'touch_orbit';

  if (pointerType === 'mouse') {
    if (button === 1 || (button === 0 && (altKey || shiftKey))) return 'orbit';
    if (button === 0) return 'pan_candidate';
    return 'tool_or_click';
  }

  if (button === 2 || (buttons & 2) !== 0) return 'orbit';
  if (button === 0) return 'pan_candidate';
  return 'tool_or_click';
}

export function wheelDeltaToZoomFactor(deltaY: number, deltaMode: number = 0, ctrlKey: boolean = false): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1;

  let pixels = deltaY;
  if (deltaMode === 1) pixels *= 16;
  if (deltaMode === 2) pixels *= 800;

  const bounded = Math.max(-180, Math.min(180, pixels));
  const gain = ctrlKey ? 0.0042 : 0.0018;
  return Math.exp(bounded * gain);
}

export class PointerManager {
  private element: HTMLElement;
  private callbacks: PointerCallbacks;

  private activePointers: Map<number, NormalizedPointerEvent> = new Map();
  private prevPositions: Map<number, { clientX: number; clientY: number }> = new Map();
  private startPositions: Map<number, { clientX: number; clientY: number; time: number }> = new Map();
  private navigationModes: Map<number, NavigationPressMode> = new Map();

  private prevPinchDistance: number | null = null;
  private prevPinchCenter: { x: number; y: number } | null = null;

  public currentState: GestureState = 'idle';

  private activePenId: number | null = null;
  private lastPenActiveTime = 0;
  private palmRejectionRadiusPx = 110;

  private lastTapInfo: { x: number; y: number; time: number; pointerType: 'mouse' | 'pen' | 'touch' } | null = null;

  public isManipulatingObject = false;
  public isDrawingOrbit = false;

  private previousTouchAction: string;
  private previousUserSelect: string;
  private previousOverscrollBehavior: string;

  constructor(element: HTMLElement, callbacks: PointerCallbacks) {
    this.element = element;
    this.callbacks = callbacks;

    this.previousTouchAction = element.style.touchAction;
    this.previousUserSelect = element.style.userSelect;
    this.previousOverscrollBehavior = element.style.overscrollBehavior;
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';
    element.style.overscrollBehavior = 'none';

    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
    this.element.addEventListener('pointerleave', this.handlePointerLeave);
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.handleContextMenu);
  }

  public destroy(): void {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.element.removeEventListener('pointerleave', this.handlePointerLeave);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);

    this.element.style.touchAction = this.previousTouchAction;
    this.element.style.userSelect = this.previousUserSelect;
    this.element.style.overscrollBehavior = this.previousOverscrollBehavior;
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private setState(newState: GestureState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.callbacks.onGestureStateChange?.(newState);
  }

  private normalize(e: PointerEvent, deltaX = 0, deltaY = 0, buttonsOverride?: number): NormalizedPointerEvent {
    const rawEvent = buttonsOverride === undefined
      ? e
      : ({
          buttons: buttonsOverride,
          button: e.button,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        } as PointerEvent);

    return {
      pointerId: e.pointerId,
      pointerType: e.pointerType as 'mouse' | 'pen' | 'touch',
      clientX: e.clientX,
      clientY: e.clientY,
      deltaX,
      deltaY,
      pressure: e.pressure,
      isPrimary: e.isPrimary,
      rawEvent,
    };
  }

  private slopFor(pointerType: string): number {
    if (pointerType === 'mouse') return PARABLE_MOUSE_DRAG_THRESHOLD_PX;
    if (pointerType === 'pen') return PEN_SLOP_PX;
    return TOUCH_SLOP_PX;
  }

  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  private isPalmContact(e: PointerEvent): boolean {
    if (e.pointerType !== 'touch') return false;

    const now = performance.now();
    const isPenRecent = this.activePenId !== null || now - this.lastPenActiveTime < 350;
    if (!isPenRecent) return false;

    const radiusX = (e as PointerEvent & { radiusX?: number }).radiusX || 0;
    const radiusY = (e as PointerEvent & { radiusY?: number }).radiusY || 0;
    const isLargeContact = radiusX > 22 || radiusY > 22 || e.width > 35 || e.height > 35;

    if (this.activePenId !== null) {
      const penPos = this.prevPositions.get(this.activePenId);
      if (penPos) {
        const distToPen = Math.hypot(e.clientX - penPos.clientX, e.clientY - penPos.clientY);
        if (distToPen < this.palmRejectionRadiusPx) return true;
      }
    }

    return isLargeContact;
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'pen') {
      this.activePenId = e.pointerId;
      this.lastPenActiveTime = performance.now();
    } else if (this.isPalmContact(e)) {
      return;
    }

    const pointerType = e.pointerType as 'mouse' | 'pen' | 'touch';
    const mode = resolveNavigationPressMode(pointerType, e.button, e.buttons, e.altKey, e.shiftKey);

    this.prevPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    this.startPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY, time: performance.now() });
    this.navigationModes.set(e.pointerId, mode);

    const norm = this.normalize(e);
    this.activePointers.set(e.pointerId, norm);

    try {
      this.element.setPointerCapture(e.pointerId);
    } catch {}

    if (this.activePointers.size === 2) {
      if (this.isDrawingOrbit || this.isManipulatingObject) {
        this.isDrawingOrbit = false;
        this.isManipulatingObject = false;
        this.callbacks.onPointerCancel(norm);
      }

      this.setState('two_finger_navigation');
      this.seedPinchState();
      return;
    }

    if (mode === 'orbit') {
      this.setState('camera_orbit');
      return;
    }

    this.setState('tap_candidate');
    this.callbacks.onPointerDown(norm);

    if (this.isDrawingOrbit) this.navigationModes.set(e.pointerId, 'tool_or_click');
    if (this.isManipulatingObject) this.navigationModes.set(e.pointerId, 'tool_or_click');
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'pen') {
      this.lastPenActiveTime = performance.now();
      if (e.buttons === 0 && !this.activePointers.has(e.pointerId)) {
        this.setState('pen_hover');
      }
    } else if (this.isPalmContact(e)) {
      return;
    }

    const prev = this.prevPositions.get(e.pointerId);
    const deltaX = prev ? e.clientX - prev.clientX : e.movementX || 0;
    const deltaY = prev ? e.clientY - prev.clientY : e.movementY || 0;
    this.prevPositions.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const norm = this.normalize(e, deltaX, deltaY);
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, norm);
    }

    if (this.activePointers.size === 2 && !this.isManipulatingObject && !this.isDrawingOrbit) {
      this.setState('two_finger_navigation');
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const center = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      if (this.prevPinchDistance && this.prevPinchDistance > 1 && dist > 1) {
        const factor = this.prevPinchDistance / dist;
        if (Number.isFinite(factor) && factor > 0) this.callbacks.onPinchZoom(factor, center);
      }

      if (this.prevPinchCenter) {
        this.callbacks.onTwoFingerPan(center.x - this.prevPinchCenter.x, center.y - this.prevPinchCenter.y);
      }

      this.prevPinchDistance = Math.max(dist, 1);
      this.prevPinchCenter = center;
      return;
    }

    const mode = this.navigationModes.get(e.pointerId);

    if (!this.activePointers.has(e.pointerId)) {
      this.callbacks.onPointerMove(norm);
      return;
    }

    if (mode === 'orbit') {
      this.setState('camera_orbit');
      this.callbacks.onPointerMove(
        this.normalize(e, deltaX * PARABLE_ORBIT_DELTA_SCALE, deltaY * PARABLE_ORBIT_DELTA_SCALE, 1)
      );
      return;
    }

    if (this.isDrawingOrbit || this.isManipulatingObject || mode === 'tool_or_click') {
      this.setState(this.isDrawingOrbit ? 'orbit_draw' : this.isManipulatingObject ? 'body_drag' : 'tap_candidate');
      this.callbacks.onPointerMove(norm);
      return;
    }

    const start = this.startPositions.get(e.pointerId);
    const moved = start ? Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) : 0;
    const slop = this.slopFor(e.pointerType);

    if (mode === 'pan_candidate') {
      if (moved >= slop) this.setState('camera_pan');
      if (this.currentState === 'camera_pan') {
        this.callbacks.onTwoFingerPan(deltaX, deltaY);
      }
      return;
    }

    if (mode === 'touch_orbit') {
      if (moved >= slop) this.setState('camera_orbit');
      if (this.currentState === 'camera_orbit') {
        this.callbacks.onPointerMove(norm);
      }
      return;
    }

    this.callbacks.onPointerMove(norm);
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.activePenId) {
      this.activePenId = null;
      this.lastPenActiveTime = performance.now();
    }

    const prev = this.prevPositions.get(e.pointerId);
    const deltaX = prev ? e.clientX - prev.clientX : 0;
    const deltaY = prev ? e.clientY - prev.clientY : 0;
    const start = this.startPositions.get(e.pointerId);
    const stateBeforeRelease = this.currentState;

    const norm = this.normalize(e, deltaX, deltaY);

    this.activePointers.delete(e.pointerId);
    this.prevPositions.delete(e.pointerId);
    this.startPositions.delete(e.pointerId);
    this.navigationModes.delete(e.pointerId);

    try {
      this.element.releasePointerCapture(e.pointerId);
    } catch {}

    if (start && stateBeforeRelease === 'tap_candidate') {
      const dist = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);
      const duration = performance.now() - start.time;
      if (dist <= this.slopFor(e.pointerType) && duration < 400) {
        const now = performance.now();
        const pointerType = e.pointerType as 'mouse' | 'pen' | 'touch';
        if (
          this.lastTapInfo &&
          now - this.lastTapInfo.time < 350 &&
          Math.hypot(e.clientX - this.lastTapInfo.x, e.clientY - this.lastTapInfo.y) < 24
        ) {
          this.callbacks.onDoubleTap?.(e.clientX, e.clientY, pointerType);
          this.lastTapInfo = null;
        } else {
          this.lastTapInfo = { x: e.clientX, y: e.clientY, time: now, pointerType };
        }
      }
    }

    this.callbacks.onPointerUp(norm);

    if (this.activePointers.size === 0) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.setState('idle');
      return;
    }

    if (this.activePointers.size === 1) {
      const [remainingId, remaining] = Array.from(this.activePointers.entries())[0];
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.startPositions.set(remainingId, {
        clientX: remaining.clientX,
        clientY: remaining.clientY,
        time: performance.now(),
      });
      this.prevPositions.set(remainingId, { clientX: remaining.clientX, clientY: remaining.clientY });
      this.navigationModes.set(
        remainingId,
        remaining.pointerType === 'touch' ? 'touch_orbit' : 'pan_candidate'
      );
      this.setState('tap_candidate');
    }
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    if (e.pointerId === this.activePenId) this.activePenId = null;

    this.prevPositions.delete(e.pointerId);
    this.startPositions.delete(e.pointerId);
    this.navigationModes.delete(e.pointerId);
    const norm = this.normalize(e);
    this.activePointers.delete(e.pointerId);

    if (this.activePointers.size === 0) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      this.setState('idle');
    }

    this.callbacks.onPointerCancel(norm);
  };

  private handlePointerLeave = (): void => {
    if (this.activePointers.size === 0) this.setState('idle');
    this.callbacks.onPointerLeave?.();
  };

  private seedPinchState(): void {
    const pts = Array.from(this.activePointers.values());
    if (pts.length !== 2) {
      this.prevPinchDistance = null;
      this.prevPinchCenter = null;
      return;
    }

    this.prevPinchDistance = Math.max(
      Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY),
      1
    );
    this.prevPinchCenter = {
      x: (pts[0].clientX + pts[1].clientX) / 2,
      y: (pts[0].clientY + pts[1].clientY) / 2,
    };
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.isDrawingOrbit || this.isManipulatingObject) return;

    const factor = wheelDeltaToZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey);
    if (factor === 1) return;
    this.callbacks.onPinchZoom(factor, { x: e.clientX, y: e.clientY });
  };
}
