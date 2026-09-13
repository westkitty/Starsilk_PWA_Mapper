/**
 * BACK02: Multi-Level Undo/Redo History Stack.
 * Captures full reversible state snapshots for body edits, deletions, and additions.
 */

import { CelestialBody } from "./types";

export interface SystemSnapshotState {
  bodies: CelestialBody[];
  selectedBodyId: string | null;
  description: string;
}

export class UndoStack {
  private undoHistory: SystemSnapshotState[] = [];
  private redoHistory: SystemSnapshotState[] = [];
  private maxDepth: number = 30;

  pushState(bodies: CelestialBody[], selectedBodyId: string | null, description: string): void {
    const clone: SystemSnapshotState = {
      bodies: bodies.map(b => ({
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
        rings: b.rings ? b.rings.map(r => ({ ...r, normal: { ...r.normal } })) : [],
      })),
      selectedBodyId,
      description,
    };

    this.undoHistory.push(clone);
    if (this.undoHistory.length > this.maxDepth) {
      this.undoHistory.shift();
    }
    // Any new action clears the redo stack
    this.redoHistory = [];
  }

  canUndo(): boolean {
    return this.undoHistory.length > 0;
  }

  canRedo(): boolean {
    return this.redoHistory.length > 0;
  }

  undo(currentBodies: CelestialBody[], currentSelectedId: string | null): SystemSnapshotState | null {
    if (this.undoHistory.length === 0) return null;

    const previous = this.undoHistory.pop()!;
    // Push current to redo
    this.redoHistory.push({
      bodies: currentBodies.map(b => ({
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
        rings: b.rings ? b.rings.map(r => ({ ...r, normal: { ...r.normal } })) : [],
      })),
      selectedBodyId: currentSelectedId,
      description: "State before undo",
    });

    return previous;
  }

  redo(currentBodies: CelestialBody[], currentSelectedId: string | null): SystemSnapshotState | null {
    if (this.redoHistory.length === 0) return null;

    const next = this.redoHistory.pop()!;
    this.undoHistory.push({
      bodies: currentBodies.map(b => ({
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
        rings: b.rings ? b.rings.map(r => ({ ...r, normal: { ...r.normal } })) : [],
      })),
      selectedBodyId: currentSelectedId,
      description: "State before redo",
    });

    return next;
  }

  clear(): void {
    this.undoHistory = [];
    this.redoHistory = [];
  }
}

export const undoStack = new UndoStack();
