import React, { useState, useMemo } from 'react';
import { GravityGradientSolver } from '../simulation/gravity-gradient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GravityGradientTorqueModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [pitchDeg, setPitchDeg] = useState(15);
  const [altKm, setAltKm] = useState(500);

  const state = useMemo(() => {
    const muEarth = 3.986e14;
    const rMeters = (6371 + altKm) * 1000;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    return GravityGradientSolver.calculateTorque(muEarth, rMeters, pitchRad);
  }, [pitchDeg, altKm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-purple-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-purple-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
            <span>🛰️</span> Gravity Gradient Attitude Stabilization
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Pitch Deviation Angle (θ):</span>
              <span className="text-purple-300 font-bold">{pitchDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={pitchDeg}
              onChange={e => setPitchDeg(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Orbital Altitude:</span>
              <span className="text-purple-300 font-bold">{altKm} km</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={altKm}
              onChange={e => setAltKm(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded border border-slate-700/40">
            <div>
              <span className="text-slate-400">Restoring Torque:</span>
              <div className="text-purple-300 font-bold">{state.torqueNm.toExponential(3)} N·m</div>
            </div>
            <div>
              <span className="text-slate-400">Libration Period:</span>
              <div className="text-amber-300 font-bold">{state.librationPeriodMinutes.toFixed(1)} min</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded">
            Differential gravitational pull along the satellite's long axis exerts a natural restoring torque aligning the tether towards the planet nadir.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
