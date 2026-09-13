import React from 'react';
import { CelestialBody } from '../simulation/types';
import { detectResonances } from '../simulation/resonances';

interface ResonanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const ResonanceModal: React.FC<ResonanceModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const resonances = detectResonances(bodies);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-indigo-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🪐</span>
            <h2 className="text-lg font-bold tracking-wide text-indigo-400">Mean-Motion Resonance Catalog</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Gravitational resonances occur when orbiting bodies exert periodic gravitational influence on each other, often stabilizing orbits in integer period ratios.
        </p>

        <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
          {resonances.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No active mean-motion resonances detected in current system.
            </div>
          ) : (
            resonances.map((r, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-200">{r.body1Name}</span>
                  <span className="text-slate-500 mx-2">↔</span>
                  <span className="font-semibold text-slate-200">{r.body2Name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="rounded bg-indigo-950 px-2 py-0.5 font-mono text-xs text-indigo-300 font-bold border border-indigo-700/50">
                    {r.ratio}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Δ {(r.divergence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
