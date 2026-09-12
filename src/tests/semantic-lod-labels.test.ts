import { describe, expect, it } from 'vitest';
import { CelestialBody, Vector3D } from '../simulation/types';
import { FloatingOrigin } from '../rendering/floating-origin';
import { ScaleTransform } from '../rendering/scale-transform';
import { EncounterOverlay } from '../rendering/encounter-overlay';
import { layoutSmartLabels, resolveSemanticLod } from '../ui/smart-body-labels';

describe('Semantic zoom and smart labels repair (#42, #50)', () => {
  it('uses hysteresis so semantic LOD does not chatter near thresholds', () => {
    expect(resolveSemanticLod(600, 'detail')).toBe('detail');
    expect(resolveSemanticLod(700, 'detail')).toBe('context');
    expect(resolveSemanticLod(530, 'context')).toBe('context');
    expect(resolveSemanticLod(500, 'context')).toBe('detail');
    expect(resolveSemanticLod(2300, 'context')).toBe('system');
    expect(resolveSemanticLod(1900, 'system')).toBe('system');
    expect(resolveSemanticLod(1700, 'system')).toBe('context');
  });

  it('preserves selected/hovered/primary labels under dense overlap', () => {
    const placements = layoutSmartLabels([
      { id: 'selected', name: 'Selected', x: 120, y: 90, depth: 1, priority: 100, selected: true },
      { id: 'hovered', name: 'Hovered', x: 120, y: 90, depth: 2, priority: 90, hovered: true },
      { id: 'primary', name: 'Primary', x: 120, y: 90, depth: 3, priority: 80, primary: true },
      { id: 'other', name: 'Other', x: 120, y: 90, depth: 4, priority: 20 },
    ], 360, 220, 4);

    const ids = new Set(placements.map(p => p.id));
    expect(ids.has('selected')).toBe(true);
    expect(ids.has('hovered')).toBe(true);
    expect(ids.has('primary')).toBe(true);
  });

  it('bounds smart labels to the viewport and respects max label density', () => {
    const candidates = Array.from({ length: 20 }, (_, index) => ({
      id: `body-${index}`,
      name: `Body ${index}`,
      x: 4 + index * 7,
      y: 5 + index * 5,
      depth: index,
      priority: index === 0 ? 100 : 20,
      selected: index === 0,
    }));

    const placements = layoutSmartLabels(candidates, 320, 180, 6);
    expect(placements.length).toBeLessThanOrEqual(6);
    for (const placement of placements) {
      expect(placement.labelX).toBeGreaterThanOrEqual(0);
      expect(placement.labelY).toBeGreaterThanOrEqual(0);
      expect(placement.labelX + placement.width).toBeLessThanOrEqual(320);
      expect(placement.labelY + placement.height).toBeLessThanOrEqual(180);
    }
  });

  it('reuses encounter marker GPU resources until forecast samples actually change', () => {
    const scale = new ScaleTransform();
    const floatingOrigin = new FloatingOrigin();
    const overlay = new EncounterOverlay(scale, floatingOrigin);

    const selected = {
      id: 'a', name: 'A', type: 'planet', massKg: 1e20, radiusKm: 1000,
      position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: '#fff',
    } as CelestialBody;
    const other = {
      id: 'b', name: 'B', type: 'planet', massKg: 1e20, radiusKm: 1000,
      position: { x: 1000, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: '#fff',
    } as CelestialBody;

    const a0: Vector3D = { x: 0, y: 0, z: 0 };
    const a1: Vector3D = { x: 1000, y: 0, z: 0 };
    const a2: Vector3D = { x: 2000, y: 0, z: 0 };
    const b0: Vector3D = { x: 1000000, y: 0, z: 0 };
    const b1: Vector3D = { x: 1100, y: 0, z: 0 };
    const b2: Vector3D = { x: 500000, y: 0, z: 0 };

    overlay.update('a', [selected, other], { a: [a0, a1, a2], b: [b0, b1, b2] });
    expect(overlay.getEncounters()).toHaveLength(1);
    const firstMarker = overlay.getGroup().children[0];
    expect(firstMarker).toBeDefined();

    // App currently rebuilds lightweight arrays around the same forecast Vector3D samples each frame.
    // That must not cause Three.js geometry/material churn.
    overlay.update('a', [selected, other], { a: [a0, a1, a2], b: [b0, b1, b2] });
    expect(overlay.getGroup().children[0]).toBe(firstMarker);

    // New sample objects represent a genuinely new forecast and should rebuild analysis once.
    overlay.update('a', [selected, other], {
      a: [{ ...a0 }, { ...a1 }, { ...a2 }],
      b: [{ ...b0 }, { ...b1 }, { ...b2 }],
    });
    expect(overlay.getGroup().children[0]).not.toBe(firstMarker);

    overlay.dispose();
  });
});
