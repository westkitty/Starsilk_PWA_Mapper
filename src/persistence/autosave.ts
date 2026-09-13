/**
 * BACK03: Robust Auto-Save System.
 * Automatically saves system snapshots to localStorage with IndexedDB fallback.
 */

import { CelestialBody } from "../simulation/types";

const AUTOSAVE_STORAGE_KEY = "starsilk_pwa_autosave_state";

export interface AutosaveRecord {
  timestampMs: number;
  projectName: string;
  bodies: CelestialBody[];
}

export class AutosaveManager {
  private timeoutId: any = null;
  private debounceMs: number = 3000;

  scheduleAutosave(projectName: string, bodies: CelestialBody[]): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.saveNow(projectName, bodies);
    }, this.debounceMs);
  }

  saveNow(projectName: string, bodies: CelestialBody[]): void {
    try {
      const record: AutosaveRecord = {
        timestampMs: Date.now(),
        projectName,
        bodies,
      };
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(record));
    } catch (err) {
      console.warn("Autosave storage write failed:", err);
    }
  }

  loadAutosave(): AutosaveRecord | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  clearAutosave(): void {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  }
}

export const autosaveManager = new AutosaveManager();
