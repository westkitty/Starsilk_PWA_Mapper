import React, { useState, useMemo } from 'react';
import { PoyntingRobertsonSolver } from '../simulation/poynting-robertson';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PoyntingRobertsonModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [grainRadiusMicrons, setGrainRadius] = useState(10);
  const [distanceAu, setDistanceAu] = useState(1.0);

  const decay = useMemo(() => {
    return PoyntingRobertsonSolver.calculateDecay(3.828e26, grainRadiusMicrons, 2.5, distanceAu);
  }, [grainRadiusMicrons, distanceAu]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-yellow-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-yellow-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <span>✨</span> Poynting-Robertson Radiative Drag
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Dust Grain Radius:</span>
              <span className="text-yellow-300 font-bold">{grainRadiusMicrons} μm</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={grainRadiusMicrons}
              onChange={e => setGrainRadius(parseInt(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Orbital Distance:</span>
              <span className="text-yellow-300 font-bold">{distanceAu.toFixed(2)} AU</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.1"
              value={distanceAu}
              onChange={e => setDistanceAu(parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
            <div className="flex justify-between">
              <span className="text-slate-400">Spiral-In Orbital Lifetime:</span>
              <span className="text-yellow-300 font-bold">
                {decay.spiralInLifetimeYears.toLocaleString(undefined, { maximumFractionDigits: 0 })} years
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tangential Drag Accel:</span>
              <span className="text-slate-300">{decay.tangentialDragAcceleration.toExponential(3)} m/s²</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded">
            Photon momentum re-radiation causes interplanetary dust grains to lose angular momentum and spiral inward to stellar cremation.
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
