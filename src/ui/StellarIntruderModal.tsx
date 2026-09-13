import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { spawnStellarIntruder } from '../simulation/stellar-intruder';
import { eventBus } from '../core/event-bus';

interface StellarIntruderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawn: (intruder: CelestialBody) => void;
}

export const StellarIntruderModal: React.FC<StellarIntruderModalProps> = ({
  isOpen,
  onClose,
  onSpawn,
}) => {
  if (!isOpen) return null;

  const [massSolar, setMassSolar] = useState(0.2); // 0.2 M_sun brown/red dwarf
  const [speedKmS, setSpeedKmS] = useState(55);
  const [periapsisAu, setPeriapsisAu] = useState(15);

  const handleLaunch = () => {
    const intruder = spawnStellarIntruder({
      massKg: massSolar * 1.989e30,
      hyperbolicExcessVelocityKmS: speedKmS,
      periapsisDistanceKm: periapsisAu * 1.496e8,
    });

    onSpawn(intruder);
    eventBus.emit('system:toast', {
      title: 'Stellar Intruder Approaching!',
      message: `Hyperbolic star injected at ${speedKmS} km/s. Orbit perturbations imminent!`,
      type: 'warning',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">☄️</span>
            <h2 className="text-lg font-bold tracking-wide text-red-400">Rogue Stellar Intruder Event</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Injects an unbound hyperbolic star passing through the planetary system, triggering severe gravitational scattering and possible ejections.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold">Intruder Mass (Solar Masses)</span>
              <span className="font-mono text-red-400 font-bold">{massSolar.toFixed(2)} M☉</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={massSolar}
              onChange={e => setMassSolar(parseFloat(e.target.value))}
              className="w-full accent-red-500 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold">Hyperbolic Velocity</span>
              <span className="font-mono text-amber-400 font-bold">{speedKmS} km/s</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={speedKmS}
              onChange={e => setSpeedKmS(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold">Periapsis Passage Distance</span>
              <span className="font-mono text-sky-400 font-bold">{periapsisAu} AU</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={periapsisAu}
              onChange={e => setPeriapsisAu(parseInt(e.target.value, 10))}
              className="w-full accent-sky-500 mt-1"
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
            onClick={handleLaunch}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition"
          >
            Launch Flyby
          </button>
        </div>
      </div>
    </div>
  );
};
