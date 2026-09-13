import React, { useState, useMemo } from 'react';
import { SolarCycleEngine } from '../simulation/solar-cycle';
import { EventBus } from '../core/event-bus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SolarCycleModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [epochYears, setEpochYears] = useState(5.5); // Peak of solar cycle

  const state = useMemo(() => {
    return SolarCycleEngine.evaluateCycle(epochYears);
  }, [epochYears]);

  const triggerCME = () => {
    EventBus.emit('scene:trigger_cme', {});
    EventBus.emit('ui:toast', {
      type: 'warning',
      message: `Coronal Mass Ejection Erupted! Sunspot Group: ${state.sunspotNumber}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-orange-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-orange-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-orange-400 flex items-center gap-2">
            <span>☀️</span> Stellar Magnetic Activity & Sunspots
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Hale Cycle Epoch:</span>
              <span className="text-orange-300 font-bold">{epochYears.toFixed(1)} yr</span>
            </div>
            <input
              type="range"
              min="0"
              max="22"
              step="0.1"
              value={epochYears}
              onChange={e => setEpochYears(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded border border-slate-700/40">
            <div>
              <span className="text-slate-400">Sunspot Number:</span>
              <div className="text-orange-300 font-bold text-base">{state.sunspotNumber}</div>
            </div>
            <div>
              <span className="text-slate-400">Magnetic Polarity:</span>
              <div className="text-sky-300 font-bold text-base">{state.magneticPolarity === 1 ? 'North (+)' : 'South (-)'}</div>
            </div>
            <div>
              <span className="text-slate-400">Solar Flare Prob:</span>
              <div className="text-amber-300 font-bold">{(state.flareProbabilityPerDay * 100).toFixed(0)}% / day</div>
            </div>
            <div>
              <span className="text-slate-400">CME Eruption Prob:</span>
              <div className="text-rose-400 font-bold">{(state.cmeProbabilityPerDay * 100).toFixed(0)}% / day</div>
            </div>
          </div>

          <button
            onClick={triggerCME}
            className="w-full py-2 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-bold rounded shadow-lg shadow-orange-900/40"
          >
            Trigger Coronal Mass Ejection (CME)
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
