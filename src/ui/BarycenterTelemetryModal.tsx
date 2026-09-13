import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { BarycenterDynamics } from '../simulation/barycenter-dynamics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const BarycenterTelemetryModal: React.FC<Props> = ({ isOpen, onClose, bodies }) => {
  if (!isOpen) return null;

  const report = useMemo(() => {
    return BarycenterDynamics.computeBarycenter(bodies);
  }, [bodies]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-indigo-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-indigo-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
            <span>⚖️</span> System Center of Mass (Barycenter)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-800/60 p-3 rounded">
            <div className="text-slate-400 mb-1">Barycenter Coordinates (AU):</div>
            <div className="text-slate-200">
              X: {report.centerOfMass.x.toFixed(5)} | Y: {report.centerOfMass.y.toFixed(5)} | Z: {report.centerOfMass.z.toFixed(5)}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded">
            <div className="text-slate-400 mb-1">Primary Stellar Reflex Displacement:</div>
            <div className="text-amber-300 font-semibold">
              {report.primaryDisplacementFromBarycenter.toFixed(5)} AU
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded">
            <div className="text-slate-400 mb-1">Stellar Reflex Wobble Velocity:</div>
            <div className="text-cyan-300 font-semibold">
              {report.primaryReflexSpeed.toFixed(4)} km/s
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded flex justify-between">
            <span className="text-slate-400">Total System Mass:</span>
            <span className="text-slate-200 font-semibold">{report.totalMass.toFixed(2)} M☉</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
