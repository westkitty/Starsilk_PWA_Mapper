import { describe, expect, it } from 'vitest';
import { resolveNavigationPressMode, wheelDeltaToZoomFactor } from '../interaction/pointer-manager';

describe('Parable-derived cross-device navigation policy', () => {
  it('maps plain mouse LMB to thresholded pan and MMB/modifier-LMB to orbit', () => {
    expect(resolveNavigationPressMode('mouse', 0, 1, false, false)).toBe('pan_candidate');
    expect(resolveNavigationPressMode('mouse', 1, 4, false, false)).toBe('orbit');
    expect(resolveNavigationPressMode('mouse', 0, 1, true, false)).toBe('orbit');
    expect(resolveNavigationPressMode('mouse', 0, 1, false, true)).toBe('orbit');
  });

  it('preserves touch orbit entry while reserving two-pointer logic for pinch/pan', () => {
    expect(resolveNavigationPressMode('touch', 0, 1, false, false)).toBe('touch_orbit');
  });

  it('maps plain S Pen press to pan candidate and barrel button to orbit', () => {
    expect(resolveNavigationPressMode('pen', 0, 1, false, false)).toBe('pan_candidate');
    expect(resolveNavigationPressMode('pen', 2, 2, false, false)).toBe('orbit');
    expect(resolveNavigationPressMode('pen', 0, 2, false, false)).toBe('orbit');
  });

  it('uses one signed wheel/trackpad zoom convention: up=in, down=out', () => {
    const zoomIn = wheelDeltaToZoomFactor(-100, 0, false);
    const zoomOut = wheelDeltaToZoomFactor(100, 0, false);
    expect(zoomIn).toBeLessThan(1);
    expect(zoomOut).toBeGreaterThan(1);
    expect(zoomIn * zoomOut).toBeCloseTo(1, 5);
  });

  it('keeps ctrl-wheel trackpad pinch on the same signed zoom path', () => {
    expect(wheelDeltaToZoomFactor(-8, 0, true)).toBeLessThan(1);
    expect(wheelDeltaToZoomFactor(8, 0, true)).toBeGreaterThan(1);
  });
});
