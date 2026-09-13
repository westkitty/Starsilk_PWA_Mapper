import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { SynodicPeriodCalculator } from '../simulation/synodic-periods';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const SynodicPeriodModal: React.FC<Props> = ({ isOpen, onClose, bodies }) => {
  if (!isOpen) return null;

  const planets = useMemo(() => {
    return bodies.filter(b => b.type !== 'star');
  }, [bodies]);

  const pairs = useMemo(() => {
    const list = [];
    for (let i = 0; i < Math.min(planets.length, 5); i++) {
      for (let j = i + 1; j < Math.min(planets.length, 5); j++) {
        const p1 = planets[i];
        const p2 = planets[j];
        const a1 = Math.hypot(p1.position.x, p1.position.y, p1.position.z) || 1.0;
        const a2 = Math.hypot(p2.position.x, p2.position.y, p2.position.z) || 1.5;
        const period1 = Math.pow(a1, 1.5) * 365.25;
        const period2 = Math.pow(a2, 1.5) * 365.25;
        list.push(SynodicPeriodCalculator.calculateSynodic(p1.name, p2.name, period1, period2));
      }
    }
    return list;
  }, [planets]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-emerald-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <span>📅</span> Planetary Synodic Alignment Periods
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-3">
          <div className="text-slate-300">
            Time between successive oppositions / conjunctions (1/S = |1/P₁ - 1/P₂|):
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {pairs.map((pair, idx) => (
              <div key={idx} className="bg-slate-800/60 p-2.5 rounded border border-slate-700/40 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-emerald-300">{pair.body1Id} ↔ {pair.body2Id}</div>
                  <div className="text-[10px] text-slate-400">Repeats every {pair.patternRepetitionYears.toFixed(2)} yr</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-200">{pair.synodicPeriodDays.toFixed(1)} d</div>
                  <div className="text-[10px] text-amber-400">Next: {pair.nextOppositionDays.toFixed(0)} d</div>
                </div>
              </div>
            ))}
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
