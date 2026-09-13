import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { TidalHeatingSolver } from '../simulation/tidal-heating';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const TidalHeatMapModal: React.FC<Props> = ({ isOpen, onClose, bodies, selectedBodyId }) => {
  if (!isOpen) return null;

  const moon = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId) || bodies[1] || bodies[0];
  }, [bodies, selectedBodyId]);

  const primary = useMemo(() => bodies[0], [bodies]);

  const result = useMemo(() => {
    const dx = moon.position.x - primary.position.x;
    const dy = moon.position.y - primary.position.y;
    const dz = moon.position.z - primary.position.z;
    const distMeters = Math.hypot(dx, dy, dz) * 1.496e11;
    const moonRadiusMeters = (moon.radiusKm || ((moon.radius || 1) * 6371)) * 1000;
    const primaryMassKg = primary.massKg || ((primary.mass || 1) * 1.989e30);
    const meanMotion = 1e-5; // typical satellite mean motion
    const e = 0.02; // eccentricity proxy
    return TidalHeatingSolver.calculateTidalHeating(primaryMassKg, moonRadiusMeters, distMeters, e, meanMotion);
  }, [moon, primary]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-rose-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-rose-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
            <span>🌋</span> Tidal Dissipation & Internal Heating
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {moon && result ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Target Body:</span>
              <span className="font-bold text-rose-300">{moon.name}</span>
            </div>

            <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
              <div className="flex justify-between">
                <span>Dissipation Power:</span>
                <span className="text-rose-300 font-bold">{result.dissipationPowerWatts.toExponential(2)} W</span>
              </div>
              <div className="flex justify-between">
                <span>Surface Heat Flux:</span>
                <span className="text-amber-300 font-bold">{result.heatFluxWPerM2.toFixed(3)} W/m²</span>
              </div>
            </div>

            <div className={`p-3 rounded border ${result.isVolcanicallyActive ? 'bg-rose-950/40 border-rose-500/50' : 'bg-slate-800/60 border-slate-700'}`}>
              <div className="font-semibold text-slate-200">Activity Classification:</div>
              <div className="text-[11px] mt-1 text-slate-300">
                {result.isVolcanicallyActive ? '🔥 Hyper-Volcanic Resurfacing (Io-class)' : (result.subsurfaceOceanLikely ? '🌊 Subsurface Liquid Ocean Maintained (Europa-class)' : '❄️ Geologically Quiescent')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Select a satellite orbiting a primary body</div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
