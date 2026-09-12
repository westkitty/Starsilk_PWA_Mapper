import { describe, expect, it } from 'vitest';
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
});
