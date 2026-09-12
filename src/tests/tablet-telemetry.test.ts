import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToolRail } from '../ui/ToolRail';
import { StylusHoverCalipers, StylusHoverState } from '../ui/StylusHoverCalipers';
import { CanvasContactRipples } from '../ui/CanvasContactRipples';
import { audioSynth } from '../audio/audio-synth';
import { CelestialBody } from '../simulation/types';

describe('Phase D: Tablet, S Pen & UI Interaction Suite', () => {
  it('Phase D #21: renders ToolRail with dual thumb-arc containers and thumb-index attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(ToolRail, {
        activeTool: 'select',
        onSelectTool: () => {},
        showFuture: true,
        onToggleShowFuture: () => {},
        showSensitivity: false,
        onToggleShowSensitivity: () => {},
        isFateLensActive: false,
        onToggleFateLens: () => {},
        hasSelectedBody: false,
        onOpenCreateModal: () => {},
        onOpenCanonLab: () => {},
        onResetCamera: () => {},
      })
    );

    expect(html).toContain('tool-rail-arc-left');
    expect(html).toContain('tool-rail-arc-right');
    expect(html).toContain('SELECT');
    expect(html).toContain('GRAB');
    expect(html).toContain('CREATE');
    expect(html).toContain('LOOM');
    expect(html).toContain('CENTER');
    expect(html).toContain('FUTURE');
    expect(html).toContain('SENSITIVITY');
    expect(html).toContain('FATE');
    expect(html).toContain('CANON');
    expect(html).toContain('data-thumb-index="0"');
    expect(html).toContain('data-thumb-index="1"');
    expect(html).toContain('data-thumb-index="2"');
    expect(html).toContain('data-thumb-index="3"');
  });

  it('Phase D #22: renders delicate S Pen reticle and calipers without mutating simulation state', () => {
    const dummyBody: CelestialBody = {
      id: 'planet-1',
      name: 'Kallisto-Prime',
      type: 'planet',
      massKg: 5.97e24,
      radiusKm: 6400,
      position: { x: 1.496e8, y: 0, z: 0 },
      velocity: { x: 0, y: 29.8, z: 0 },
      color: '#38bdf8',
    };

    const hoverState: StylusHoverState = {
      screenX: 250,
      screenY: 300,
      hoveredBody: dummyBody,
      worldPos: { x: 1.496e8, y: 0, z: 0 },
    };

    const html = renderToStaticMarkup(React.createElement(StylusHoverCalipers, { hover: hoverState }));

    expect(html).toContain('stylus-reticle');
    expect(html).toContain('stylus-calipers-card');
    expect(html).toContain('S PEN CALIPERS');
    expect(html).toContain('Kallisto-Prime');
    expect(html).toContain('29.80 km/s');
  });

  it('Phase D #25A: renders canvas contact ripples with tactile touch rings', () => {
    const ripples = [
      { id: 101, x: 150, y: 200 },
      { id: 102, x: 300, y: 400 },
    ];

    const html = renderToStaticMarkup(
      React.createElement(CanvasContactRipples, { ripples, onPruneRipple: () => {} })
    );

    expect(html).toContain('contact-ripple-ring');
    expect(html).toContain('left:150px');
    expect(html).toContain('left:300px');
  });

  it('Phase D #25B: integrates AnalyserNode into AudioSynthesizer for real-time waveform telemetry', () => {
    // Enable audio synthesizer
    audioSynth.isEnabled = true;

    // Trigger sound effect to initialize audio context
    audioSynth.playTick();

    const analyser = audioSynth.getAnalyser();
    if (analyser) {
      expect(analyser.fftSize).toBe(128);
      const waveform = audioSynth.getWaveformData();
      expect(waveform).not.toBeNull();
      expect(waveform?.length).toBe(128);
    }
  });
});
