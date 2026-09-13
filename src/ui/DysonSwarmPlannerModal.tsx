import React, { useState, useMemo } from 'react';
import { DysonSwarmEngine } from '../simulation/dyson-swarm';
import { EventBus } from '../core/event-bus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DysonSwarmPlannerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [collectors, setCollectors] = useState(50000);
  const [radiusAu, setRadiusAu] = useState(0.4);

  const stats = useMemo(() => {
    return DysonSwarmEngine.calculateSwarm(3.828e26, collectors, 500, radiusAu);
  }, [collectors, radiusAu]);

  const deploySwarm = () => {
    EventBus.emit('ui:toast', {
      type: 'success',
      message: `Dyson Swarm Deployed! Harvesting ${stats.powerHarvestedWatts.toExponential(2)} Watts (Kardashev ${stats.kardashevLevel.toFixed(2)})`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-cyan-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <span>⚙️</span> Dyson Swarm Megastructure Planner
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Collector Units Count:</span>
              <span className="text-cyan-300 font-bold">{collectors.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={collectors}
              onChange={e => setCollectors(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Swarm Orbital Radius:</span>
              <span className="text-cyan-300 font-bold">{radiusAu.toFixed(2)} AU</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={radiusAu}
              onChange={e => setRadiusAu(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded border border-slate-700/40">
            <div>
              <span className="text-slate-400">Harvested Power:</span>
              <div className="text-cyan-300 font-bold">{stats.powerHarvestedWatts.toExponential(2)} W</div>
            </div>
            <div>
              <span className="text-slate-400">Kardashev Level:</span>
              <div className="text-emerald-400 font-bold">K {stats.kardashevLevel.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-slate-400">Stellar Obscuration:</span>
              <div className="text-amber-300 font-bold">{(stats.stellarFractionObscured * 100).toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-slate-400">Infrared Waste Heat:</span>
              <div className="text-rose-300 font-bold">{stats.infraredWasteTempK.toFixed(0)} K</div>
            </div>
          </div>

          <button
            onClick={deploySwarm}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded shadow-lg shadow-cyan-900/40"
          >
            Construct Dyson Swarm Shell
          </button>
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
