import React, { useMemo, useEffect, useRef } from 'react';
import { CelestialBody } from '../simulation/types';
import { SpectroscopySolver } from '../simulation/spectroscopy';
import { SpectroscopyChartGenerator } from '../rendering/spectroscopy-chart';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const SpectroscopyModal: React.FC<Props> = ({ isOpen, onClose, bodies, selectedBodyId }) => {
  const spectrumCanvasRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const body = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId) || bodies[0];
  }, [bodies, selectedBodyId]);

  const spectrum = useMemo(() => {
    if (!body) return null;
    const tempK = (body as any).temperature || 288;
    const pressure = (body as any).pressure || 1.0;
    const water = (body as any).waterCoverage || 0.7;
    const volcanism = (body as any).volcanicActivity || 0.1;
    return SpectroscopySolver.analyzeAtmosphere(tempK, pressure, water, volcanism);
  }, [body]);

  useEffect(() => {
    if (!spectrumCanvasRef.current || !spectrum) return;
    spectrumCanvasRef.current.innerHTML = '';
    const notches: number[] = [430, 486, 527, 589, 656, 687];
    if (spectrum.o2 > 0.1) notches.push(760);
    if (spectrum.h2o > 0.05) notches.push(720);
    const canvas = SpectroscopyChartGenerator.generateSpectrumCanvas(360, 48, notches);
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '48px';
      canvas.style.borderRadius = '4px';
      spectrumCanvasRef.current.appendChild(canvas);
    }
  }, [spectrum]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-cyan-950/60">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <span>🔬</span> Optical Spectroscopy & Biosignatures
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {body && spectrum ? (
          <div className="space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Target Body:</span>
              <span className="font-bold text-cyan-300">{body.name}</span>
            </div>

            <div className="space-y-2 bg-slate-800/40 p-3 rounded border border-slate-700/50">
              <div className="text-slate-300 font-semibold mb-1">Atmospheric Constituents:</div>
              <div className="flex justify-between">
                <span>H₂O (Water Vapor):</span>
                <span className="text-sky-400">{(spectrum.h2o * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>CO₂ (Carbon Dioxide):</span>
                <span className="text-amber-400">{(spectrum.co2 * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>O₂ (Oxygen):</span>
                <span className="text-emerald-400">{(spectrum.o2 * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>CH₄ (Methane):</span>
                <span className="text-purple-400">{(spectrum.ch4 * 100).toFixed(4)}%</span>
              </div>
              <div className="flex justify-between">
                <span>N₂ (Nitrogen):</span>
                <span className="text-blue-300">{(spectrum.n2 * 100).toFixed(2)}%</span>
              </div>
            </div>

            <div className="space-y-1 bg-slate-800/40 p-2.5 rounded border border-slate-700/50">
              <div className="text-slate-400 text-[10px]">Fraunhofer Absorption Spectrum:</div>
              <div ref={spectrumCanvasRef} className="rounded overflow-hidden" />
            </div>

            <div className="bg-slate-800/80 p-3 rounded border border-emerald-500/30 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">Biosignature Index:</div>
                <div className="text-[10px] text-slate-400">Disequilibrium co-presence</div>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {(spectrum.biosignatureIndex * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">No celestial body selected</div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
