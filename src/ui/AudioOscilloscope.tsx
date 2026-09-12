import React, { useEffect, useRef } from 'react';
import { audioSynth } from '../audio/audio-synth';

/**
 * Low-Profile Audio Oscilloscope (Phase D #25B).
 * Renders a crisp 2px waveform strip along the top edge of TimelineBar
 * registering synthesizer clicks and harmonic feedback without obscuring controls.
 */
export const AudioOscilloscope: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const sampleBuffer = new Uint8Array(128);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const data = audioSynth.getWaveformData(sampleBuffer);

      ctx.lineWidth = 1;
      ctx.beginPath();

      if (!data || !audioSynth.isEnabled) {
        // Silent resting baseline: subtle dark-azure line
        ctx.strokeStyle = 'rgba(12, 198, 255, 0.2)';
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      } else {
        // Active waveform
        ctx.strokeStyle = '#0cc6ff';
        const sliceWidth = w / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0; // 0.0 to 2.0, center 1.0
          const y = (v * h) / 2.0;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`audio-oscilloscope-strip ${className || ''}`}
      width={600}
      height={3}
      style={{
        width: '100%',
        height: '2px',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
};
