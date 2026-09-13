import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { ManeuverNode, applyManeuverBurn } from '../simulation/maneuver-nodes';
import { eventBus } from '../core/event-bus';

interface ManeuverNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  onApplyBurn: (updatedBodies: CelestialBody[]) => void;
}

export const ManeuverNodeModal: React.FC<ManeuverNodeModalProps> = ({
  isOpen,
  onClose,
  bodies,
  onApplyBurn,
}) => {
  if (!isOpen) return null;

  const manageableBodies = bodies.filter(b => b.type !== 'star' && !b.fixed);
  const [targetId, setTargetId] = useState<string>(manageableBodies[0]?.id || '');
  const [prograde, setPrograde] = useState<number>(0);
  const [normal, setNormal] = useState<number>(0);
  const [radial, setRadial] = useState<number>(0);

  const selectedBody = bodies.find(b => b.id === targetId);

  const handleExecute = () => {
    if (!selectedBody) return;

    const node: ManeuverNode = {
      id: `maneuver_${Date.now()}`,
      targetBodyId: targetId,
      epochSeconds: 0,
      deltaVProgradeKmS: prograde,
      deltaVNormalKmS: normal,
      deltaVRadialKmS: radial,
    };

    const updated = bodies.map(b => (b.id === targetId ? applyManeuverBurn(b, node) : b));
    onApplyBurn(updated);
    eventBus.emit('system:toast', {
      title: 'Maneuver Executed',
      message: `Burn applied to ${selectedBody.name} (Δv: ${(Math.sqrt(prograde**2 + normal**2 + radial**2)).toFixed(3)} km/s)`,
      type: 'info',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-yellow-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🚀</span>
            <h2 className="text-lg font-bold tracking-wide text-yellow-400">Impulsive Maneuver Node</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-400 uppercase font-semibold">Target Spacecraft / Body</label>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
          >
            {manageableBodies.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Prograde / Retrograde (km/s)</span>
              <span className="font-mono text-yellow-400">{prograde.toFixed(2)} km/s</span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={prograde}
              onChange={e => setPrograde(parseFloat(e.target.value))}
              className="w-full accent-yellow-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Normal / Anti-Normal (km/s)</span>
              <span className="font-mono text-purple-400">{normal.toFixed(2)} km/s</span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={normal}
              onChange={e => setNormal(parseFloat(e.target.value))}
              className="w-full accent-purple-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Radial In / Out (km/s)</span>
              <span className="font-mono text-cyan-400">{radial.toFixed(2)} km/s</span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={radial}
              onChange={e => setRadial(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => { setPrograde(0); setNormal(0); setRadial(0); }}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            Zero Sliders
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleExecute}
              className="rounded bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500 transition"
            >
              Execute Burn
            </button>
            <button
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
