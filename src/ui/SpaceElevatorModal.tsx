import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { SpaceElevatorCalculator } from '../simulation/space-elevator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const SpaceElevatorModal: React.FC<Props> = ({ isOpen, onClose, bodies, selectedBodyId }) => {
  if (!isOpen) return null;

  const planet = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId && b.type !== 'star') || bodies[1] || bodies[0];
  }, [bodies, selectedBodyId]);

  const profile = useMemo(() => {
    if (!planet) return null;
    const m = planet.massKg ? planet.massKg / 5.972e24 : (planet.mass || 1.0);
    const mu = m * 3.986e14; // normalized Earth mu proxy
    const rMeters = (planet.radiusKm || ((planet.radius || 1) * 6371)) * 1000;
    const rotPeriod = 86400; // 24h
    return SpaceElevatorCalculator.calculateProfile(mu, rMeters, rotPeriod);
  }, [planet]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-teal-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-teal-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-teal-400 flex items-center gap-2">
            <span>🗼</span> Space Elevator Tether Feasibility
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {planet && profile ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Target Planet:</span>
              <span className="font-bold text-teal-300">{planet.name}</span>
            </div>

            <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
              <div className="flex justify-between">
                <span>Synchronous Radius (R_sync):</span>
                <span className="text-teal-300 font-bold">{(profile.syncOrbitRadius / 1e6).toFixed(1)} thousand km</span>
              </div>
              <div className="flex justify-between">
                <span>Counterweight Radius:</span>
                <span className="text-slate-200">{(profile.counterweightRadius / 1e6).toFixed(1)} thousand km</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Cable Stress:</span>
                <span className="text-amber-300 font-bold">{profile.maxTensionGpa.toFixed(1)} GPa</span>
              </div>
            </div>

            <div className={`p-3 rounded border ${profile.feasibleWithKnownMaterials ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-rose-950/40 border-rose-500/50'}`}>
              <div className="font-semibold text-slate-200">Material Feasibility (CNT Limit ~ 65-100 GPa):</div>
              <div className="text-[11px] mt-1 text-slate-300">
                {profile.feasibleWithKnownMaterials ? '✅ Feasible using high-tensile Carbon Nanotubes' : '❌ Requires extreme tensile strength exceeding known allotropes'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Select a terrestrial planet</div>
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
