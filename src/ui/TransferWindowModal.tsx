import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { calculateHohmannTransfer } from '../simulation/transfer-planner';

interface TransferWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const TransferWindowModal: React.FC<TransferWindowModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const planets = bodies.filter(b => b.type === 'planet' || b.type === 'dwarf_planet');
  const [depId, setDepId] = useState<string>(planets[0]?.id || '');
  const [arrId, setArrId] = useState<string>(planets[1]?.id || planets[0]?.id || '');

  const depBody = bodies.find(b => b.id === depId);
  const arrBody = bodies.find(b => b.id === arrId);
  const star = bodies.find(b => b.type === 'star') || bodies[0];

  const depR = depBody ? Math.sqrt(depBody.position.x ** 2 + depBody.position.y ** 2 + depBody.position.z ** 2) : 1e8;
  const arrR = arrBody ? Math.sqrt(arrBody.position.x ** 2 + arrBody.position.y ** 2 + arrBody.position.z ** 2) : 2e8;
  const centralMass = star ? star.massKg : 1.989e30;

  const transfer = calculateHohmannTransfer(depR, arrR, centralMass);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-sky-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold tracking-wide text-sky-400">Interplanetary Transfer Calculator</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Departure Body</label>
            <select
              value={depId}
              onChange={e => setDepId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
            >
              {planets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Target Body</label>
            <select
              value={arrId}
              onChange={e => setArrId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
            >
              {planets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-800/60 p-4 border border-slate-700/50 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Ejection Burn (Δv1):</span>
            <span className="font-mono text-emerald-400 font-semibold">{transfer.deltaV1KmS.toFixed(3)} km/s</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Insertion Burn (Δv2):</span>
            <span className="font-mono text-emerald-400 font-semibold">{transfer.deltaV2KmS.toFixed(3)} km/s</span>
          </div>
          <div className="flex justify-between text-sm border-t border-slate-700/60 pt-2">
            <span className="text-slate-300 font-medium">Total Mission Δv:</span>
            <span className="font-mono text-sky-400 font-bold text-base">{transfer.totalDeltaVKmS.toFixed(3)} km/s</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Transfer Duration:</span>
            <span className="font-mono text-amber-300 font-semibold">{transfer.timeOfFlightDays.toFixed(1)} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Required Phase Angle:</span>
            <span className="font-mono text-purple-300 font-semibold">{transfer.phaseAngleDeg.toFixed(2)}°</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
