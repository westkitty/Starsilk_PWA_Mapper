import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { CelestialBody } from '../simulation/types';
import { OrbitalElementsSolver } from '../simulation/orbital-elements-solver';
import { EventBus } from '../core/event-bus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const OrbitalElementsTableModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bodies,
  selectedBodyId,
}) => {
  if (!isOpen) return null;

  const target = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId) || bodies[1] || bodies[0];
  }, [bodies, selectedBodyId]);

  const primary = useMemo(() => bodies[0], [bodies]);

  const elements = useMemo(() => {
    if (!target || !primary || target.id === primary.id) return null;
    const relPos = new Vector3(
      target.position.x - primary.position.x,
      target.position.y - primary.position.y,
      target.position.z - primary.position.z
    );
    const relVel = new Vector3(
      target.velocity.x - primary.velocity.x,
      target.velocity.y - primary.velocity.y,
      target.velocity.z - primary.velocity.z
    );
    const mu = primary.massKg ? primary.massKg / 1.989e30 : (primary.mass || 1.0);
    return OrbitalElementsSolver.cartesianToElements(relPos, relVel, mu);
  }, [target, primary]);

  const copyToClipboard = () => {
    if (!elements) return;
    const text = `a: ${elements.semiMajorAxis.toFixed(4)} AU\ne: ${elements.eccentricity.toFixed(4)}\ni: ${(elements.inclination * 180 / Math.PI).toFixed(2)} deg\nOmega: ${(elements.longitudeOfAscendingNode * 180 / Math.PI).toFixed(2)} deg\nomega: ${(elements.argumentOfPeriapsis * 180 / Math.PI).toFixed(2)} deg\nnu: ${(elements.trueAnomaly * 180 / Math.PI).toFixed(2)} deg\nPeriod: ${elements.period.toFixed(2)} yr`;
    navigator.clipboard?.writeText(text);
    EventBus.emit('ui:toast', { type: 'success', message: 'Orbital elements copied to clipboard' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-amber-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>📐</span> Keplerian Orbital Elements
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {target && elements ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Target:</span>
              <span className="font-bold text-amber-300">{target.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded border border-slate-700/40">
              <div>
                <span className="text-slate-400">Semi-major Axis (a):</span>
                <div className="text-amber-300 font-bold">{elements.semiMajorAxis.toFixed(4)} AU</div>
              </div>
              <div>
                <span className="text-slate-400">Eccentricity (e):</span>
                <div className="text-amber-300 font-bold">{elements.eccentricity.toFixed(4)}</div>
              </div>
              <div>
                <span className="text-slate-400">Inclination (i):</span>
                <div className="text-amber-300 font-bold">{(elements.inclination * 180 / Math.PI).toFixed(2)}°</div>
              </div>
              <div>
                <span className="text-slate-400">Asc. Node (Ω):</span>
                <div className="text-amber-300 font-bold">{(elements.longitudeOfAscendingNode * 180 / Math.PI).toFixed(2)}°</div>
              </div>
              <div>
                <span className="text-slate-400">Arg. Periapsis (ω):</span>
                <div className="text-amber-300 font-bold">{(elements.argumentOfPeriapsis * 180 / Math.PI).toFixed(2)}°</div>
              </div>
              <div>
                <span className="text-slate-400">True Anomaly (ν):</span>
                <div className="text-amber-300 font-bold">{(elements.trueAnomaly * 180 / Math.PI).toFixed(2)}°</div>
              </div>
            </div>

            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Orbital Period:</span>
              <span className="text-slate-200">{elements.period.toFixed(2)} yr</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">No orbiting target body selected</div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={copyToClipboard} className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded border border-amber-500/40">
            Copy Values
          </button>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
