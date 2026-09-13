import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { calculatePlanetaryClimate } from '../simulation/climate-sim';
import { computeEarthSimilarityIndex } from '../simulation/habitability-index';

interface ClimateInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const ClimateInspectorModal: React.FC<ClimateInspectorModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const planets = bodies.filter(b => b.type === 'planet' || b.type === 'dwarf_planet' || b.type === 'moon');
  const [selectedId, setSelectedId] = useState<string>(planets[0]?.id || '');
  const star = bodies.find(b => b.type === 'star') || bodies[0];

  const body = bodies.find(b => b.id === selectedId) || planets[0];
  const starLuminosity = star?.luminosityW || 3.828e26;

  const distKm = body ? Math.sqrt(body.position.x ** 2 + body.position.y ** 2 + body.position.z ** 2) : 1.5e8;
  const climate = body ? calculatePlanetaryClimate(body, distKm, starLuminosity) : null;
  const habitability = body ? computeEarthSimilarityIndex(body, starLuminosity) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🌿</span>
            <h2 className="text-lg font-bold tracking-wide text-emerald-400">Planetary Climate & Biosphere Diagnostics</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-400 uppercase font-semibold">Select Celestial Body</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
          >
            {planets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {climate && habitability && body && (
          <div className="mt-4 space-y-3 rounded-lg bg-slate-800/50 p-4 border border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Earth Similarity Index (ESI):</span>
              <span className="font-mono font-bold text-emerald-400">{(habitability.esi * 100).toFixed(1)}%</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Habitability Tier:</span>
              <span className="font-semibold text-sky-400">{habitability.habitabilityTier}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Surface Temp (Equilibrium):</span>
              <span className="font-mono text-amber-300 font-semibold">{climate.surfaceTempK.toFixed(1)} K ({(climate.surfaceTempK - 273.15).toFixed(1)} °C)</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Incident Stellar Flux:</span>
              <span className="font-mono text-slate-200">{climate.stellarFluxWM2.toFixed(1)} W/m²</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Surface Gravity:</span>
              <span className="font-mono text-slate-200">{habitability.surfaceGravityG.toFixed(2)} g</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Escape Velocity:</span>
              <span className="font-mono text-slate-200">{habitability.escapeVelocityKmS.toFixed(2)} km/s</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Liquid Water Status:</span>
              <span className={`font-semibold ${climate.hasLiquidWater ? 'text-emerald-400' : 'text-slate-500'}`}>
                {climate.hasLiquidWater ? '✓ Supported at Equilibrium' : '✗ Evaporated or Frozen'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
