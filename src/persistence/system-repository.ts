/**
 * System Repository & Named Saves Engine.
 * Manages named user save slots, metadata, tags, and timestamps.
 */

import { CelestialBody } from '../simulation/types';

export interface SavedSystemEntry {
  id: string;
  name: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  bodyCount: number;
  bodies: CelestialBody[];
  notes?: string;
}

const STORAGE_KEY = 'starsilk:named_systems:v1';

const memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback to memory
  }
  return memoryStore[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fallback to memory
  }
  memoryStore[key] = value;
}

export class SystemRepository {
  public static getAll(): SavedSystemEntry[] {
    try {
      const raw = getStorageItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static getById(id: string): SavedSystemEntry | null {
    const list = this.getAll();
    return list.find(s => s.id === id) || null;
  }

  public static save(
    name: string,
    bodies: CelestialBody[],
    tags: string[] = [],
    notes?: string,
    existingId?: string
  ): SavedSystemEntry {
    const list = this.getAll();
    const now = Date.now();
    const id = existingId || `sys_${now}_${Math.random().toString(36).slice(2, 7)}`;

    const entry: SavedSystemEntry = {
      id,
      name,
      tags,
      createdAt: existingId ? (list.find(s => s.id === existingId)?.createdAt || now) : now,
      updatedAt: now,
      bodyCount: bodies.length,
      bodies,
      notes,
    };

    const filtered = list.filter(s => s.id !== id);
    filtered.unshift(entry);

    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to write saved system to storage', e);
    }

    return entry;
  }

  public static delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter(s => s.id !== id);
    if (filtered.length === list.length) return false;

    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
}
