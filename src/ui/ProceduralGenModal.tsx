import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { generateProceduralSystem } from '../simulation/presets/procedural-system';
import { eventBus } from '../core/event-bus';

interface ProceduralGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (bodies: CelestialBody[]) => void;
}

export const ProceduralGenModal: React.FC<ProceduralGenModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  if (!isOpen) return null;

  const [starName, setStarName] = useState('Kepler-Nova');
  const [numPlanets, setNumPlanets] = useState(5);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 999999));

  const handleCreate = () => {
    const generated = generateProceduralSystem({
      starName,
      planetCount: numPlanets,
      seed,
    });

    onGenerate(generated.bodies);
    eventBus.emit('system:toast', {
      title: 'Procedural System Generated',
      message: `Synthesized "${starName}" with ${numPlanets} planets (Seed: ${seed})`,
      type: 'info',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold tracking-wide text-purple-400">Procedural System Synthesizer</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Primary Star Designation</label>
            <input
              type="text"
              value={starName}
              onChange={e => setStarName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold">Planet Count</span>
              <span className="font-mono text-purple-400 font-bold">{numPlanets}</span>
            </div>
            <input
              type="range"
              min="2"
              max="9"
              value={numPlanets}
              onChange={e => setNumPlanets(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold">Random Seed</span>
              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 999999))}
                className="text-purple-400 hover:text-purple-300 text-xs"
              >
                ↻ Reroll Seed
              </button>
            </div>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm font-mono text-slate-200"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition"
          >
            Synthesize System
          </button>
        </div>
      </div>
    </div>
  );
};
