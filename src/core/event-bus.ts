/**
 * BACK01: Centralized Type-Safe Event Bus.
 * Decouples simulation engine, UI modals, audio, and renderer.
 */

export type SimulationEventType =
  | "system:reset"
  | "system:loaded"
  | "system:preset_changed"
  | "body:selected"
  | "body:created"
  | "body:removed"
  | "body:updated"
  | "orbit:committed"
  | "collision:detected"
  | "resonance:detected"
  | "syzygy:detected"
  | "gravity_assist:detected"
  | "timeline:step"
  | "timeline:pause_toggle"
  | "toast:notify"
  | "system:toast"
  | "ui:toast"
  | "challenge:progress"
  | "perf:report"
  | "fx:aberration_toggle"
  | "scene:trigger_cme"
  | "scene:toggle_dyson"
  | "scene:toggle_magnetosphere"
  | "scene:toggle_roche_lobes"
  | "scene:toggle_space_elevator";

export interface EventPayloads {
  "system:reset": { timestamp: number };
  "system:loaded": { projectName: string; bodyCount: number };
  "system:preset_changed": { presetId: string };
  "body:selected": { bodyId: string | null };
  "body:created": { body: any };
  "body:removed": { bodyId: string; name: string };
  "body:updated": { bodyId: string; patch: Record<string, any> };
  "orbit:committed": { bodyId: string; semiMajorAxisKm: number; eccentricity: number };
  "collision:detected": { bodyAId: string; bodyBId: string; kineticEnergyJ?: number };
  "resonance:detected": { bodyA: string; bodyB: string; ratio: string };
  "syzygy:detected": { primary: string; alignedBodies: string[] };
  "gravity_assist:detected": { bodyId: string; primaryId: string; deltaV: number };
  "timeline:step": { dtSeconds: number; simTimeSec: number };
  "timeline:pause_toggle": { isPaused: boolean };
  "toast:notify": { message: string; type?: "info" | "success" | "warn" | "error"; durationMs?: number };
  "system:toast": { title?: string; message: string; type?: "info" | "success" | "warn" | "warning" | "error"; durationMs?: number };
  "ui:toast": { message: string; type?: "info" | "success" | "warn" | "warning" | "error"; durationMs?: number };
  "challenge:progress": { challengeId: string; isComplete: boolean; progressPct: number };
  "perf:report": { fps: number; frameDeltaMs: number; physicsStepMs: number; drawCalls: number };
  "fx:aberration_toggle": { enabled: boolean };
  "scene:trigger_cme": { origin?: any };
  "scene:toggle_dyson": { visible: boolean; radiusAu?: number };
  "scene:toggle_magnetosphere": { visible: boolean; targetBodyId?: string };
  "scene:toggle_roche_lobes": { visible: boolean };
  "scene:toggle_space_elevator": { visible: boolean; targetBodyId?: string };
}

type EventListener<K extends SimulationEventType> = (payload: EventPayloads[K]) => void;

export class EventBus {
  private listeners: { [K in SimulationEventType]?: Set<EventListener<K>> } = {};

  on<K extends SimulationEventType>(event: K, listener: EventListener<K>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<EventListener<K>>).add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  off<K extends SimulationEventType>(event: K, listener: EventListener<K>): void {
    const set = this.listeners[event];
    if (set) {
      (set as Set<EventListener<K>>).delete(listener);
    }
  }

  emit<K extends SimulationEventType>(event: K, payload: EventPayloads[K]): void {
    const set = this.listeners[event];
    if (set) {
      set.forEach(listener => {
        try {
          (listener as EventListener<K>)(payload);
        } catch (err) {
          console.error("EventBus error in " + event, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners = {};
  }

  public static on<K extends SimulationEventType>(event: K, listener: EventListener<K>): () => void {
    return eventBus.on(event, listener);
  }

  public static off<K extends SimulationEventType>(event: K, listener: EventListener<K>): void {
    eventBus.off(event, listener);
  }

  public static emit<K extends SimulationEventType>(event: K, payload: EventPayloads[K]): void {
    eventBus.emit(event, payload);
  }
}

export const eventBus = new EventBus();
