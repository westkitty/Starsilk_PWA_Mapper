import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { ASTRODYNAMIC_CHALLENGES, evaluateChallenge, ChallengeScenario } from '../simulation/challenges';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeScenario>(ASTRODYNAMIC_CHALLENGES[0]);
  const progress = evaluateChallenge(selectedChallenge, bodies);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-amber-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-lg font-bold tracking-wide text-amber-400">Astrodynamic Mission Operations</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
          {ASTRODYNAMIC_CHALLENGES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChallenge(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedChallenge.id === c.id
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-slate-800/50 p-4 border border-slate-700/50">
          <h3 className="font-semibold text-slate-200">{selectedChallenge.title}</h3>
          <p className="mt-1 text-xs text-slate-400">{selectedChallenge.briefing}</p>

          <div className="mt-4 border-t border-slate-700/60 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mission Status:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  progress.completed ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'bg-amber-950 text-amber-400 border border-amber-700/50'
                }`}
              >
                {progress.completed ? 'OBJECTIVE ACHIEVED' : 'IN PROGRESS'}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Verification Progress</span>
                <span className="font-mono">{(progress.progressFraction * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progress.progressFraction * 100}%` }}
                />
              </div>
            </div>

            <p className="mt-3 font-mono text-xs text-slate-300">{progress.statusMessage}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
