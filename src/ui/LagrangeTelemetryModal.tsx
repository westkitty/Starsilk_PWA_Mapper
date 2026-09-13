import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { calculateLagrangePoints, LagrangePointInfo } from '../rendering/lagrange-markers';

interface LagrangeTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const LagrangeTelemetryModal: React.FC<LagrangeTelemetryModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const star = bodies.find(b => b.type === 'star') || bodies[0];
  const planets = bodies.filter(b => b.type === 'planet' || b.type === 'dwarf_planet');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>(planets[0]?.id || '');

  const planet = bodies.find(b => b.id === selectedPlanetId) || planets[0];
  const points = star && planet ? calculateLagrangePoints(star, planet) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📍</span>
            <h2 className="text-lg font-bold tracking-wide text-cyan-400">Libration / Lagrange Telemetry</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-400 uppercase font-semibold">Secondary Celestial Partner</label>
          <select
            value={selectedPlanetId}
            onChange={e => setSelectedPlanetId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
          >
            {planets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {points.map((lp: LagrangePointInfo) => (
            <div
              key={lp.name}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-cyan-400">{lp.name}</span>
                <span className="text-xs text-slate-400">
                  {lp.stability === 'stable' ? 'Stable (Trojan/Greek)' : 'Unstable (Saddle Point)'}
                </span>
              </div>
              <div className="font-mono text-xs text-slate-300">
                X: {(lp.position.x / 1e6).toFixed(1)} Mkm | Y: {(lp.position.y / 1e6).toFixed(1)} Mkm
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
