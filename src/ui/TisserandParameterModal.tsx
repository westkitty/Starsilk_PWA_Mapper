import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { TisserandCalculator } from '../simulation/tisserand';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const TisserandParameterModal: React.FC<Props> = ({ isOpen, onClose, bodies, selectedBodyId }) => {
  if (!isOpen) return null;

  const smallBody = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId) || bodies[bodies.length - 1];
  }, [bodies, selectedBodyId]);

  const perturber = useMemo(() => {
    // Find gas giant or largest planet
    return bodies.find(b => b.classification === 'gas_giant') || bodies[1] || bodies[0];
  }, [bodies]);

  const classification = useMemo(() => {
    if (!smallBody || !perturber || smallBody.id === perturber.id) return null;
    const aSmall = Math.hypot(smallBody.position.x, smallBody.position.y, smallBody.position.z) || 1.0;
    const eSmall = 0.2; // default small body eccentricity
    const incSmall = 0.1;
    const aPerturber = Math.hypot(perturber.position.x, perturber.position.y, perturber.position.z) || 5.2;
    return TisserandCalculator.computeTisserand(aSmall, eSmall, incSmall, aPerturber);
  }, [smallBody, perturber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-fuchsia-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-fuchsia-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-fuchsia-400 flex items-center gap-2">
            <span>☄️</span> Tisserand Invariant & Orbit Type
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {smallBody && perturber && classification ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Perturber Body:</span>
              <span className="font-bold text-cyan-300">{perturber.name}</span>
            </div>
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Small Body:</span>
              <span className="font-bold text-fuchsia-300">{smallBody.name}</span>
            </div>

            <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
              <div className="flex justify-between">
                <span>Tisserand Parameter (T_P):</span>
                <span className="text-fuchsia-300 font-bold">{classification.tisserandValue.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dynamical Class:</span>
                <span className="text-amber-300 font-semibold uppercase">{classification.classification.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded border border-slate-700">
              <div className="text-slate-400">Scattering Encounter Risk:</div>
              <div className={`mt-1 font-semibold ${classification.isEncounterPossible ? 'text-rose-400' : 'text-emerald-400'}`}>
                {classification.isEncounterPossible ? '⚠️ Orbit intersects perturber sphere of influence' : '✅ Safe non-intersecting resonance envelope'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Select a body to evaluate against system perturber</div>
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
