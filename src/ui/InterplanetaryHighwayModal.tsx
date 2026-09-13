import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { CelestialBody } from '../simulation/types';
import { InterplanetaryHighwayEngine } from '../simulation/interplanetary-highway';
import { EventBus } from '../core/event-bus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const InterplanetaryHighwayModal: React.FC<Props> = ({ isOpen, onClose, bodies }) => {
  if (!isOpen) return null;

  const primary = bodies[0];
  const secondary = bodies[1];

  const tubes = useMemo(() => {
    if (!primary || !secondary) return [];
    const pPos = new Vector3(primary.position.x, primary.position.y, primary.position.z);
    const sPos = new Vector3(secondary.position.x, secondary.position.y, secondary.position.z);
    const l1 = pPos.clone().lerp(sPos, 0.85);
    const l2 = sPos.clone().add(sPos.clone().sub(pPos).normalize().multiplyScalar(0.15));
    return InterplanetaryHighwayEngine.generateManifolds(l1, l2, pPos, sPos);
  }, [primary, secondary]);

  const previewManifold = (name: string) => {
    EventBus.emit('ui:toast', {
      type: 'info',
      message: `Navigating Transit Corridor Approximation: ${name} (Low-Δv Transfer)`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-indigo-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-indigo-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
            <span>🌀</span> CR3BP Transit Corridor Approximations
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        <div className="space-y-3">
          <div className="text-slate-300">
            CR3BP-inspired low-energy ballistic corridor approximations derived from collinear libration geometry and Jacobi energy scaling.
          </div>

          <div className="space-y-2">
            {tubes.map((tube, idx) => (
              <div key={idx} className="bg-slate-800/60 p-3 rounded border border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-indigo-300">Tube #{idx + 1} ({tube.originLagrangePoint} Corridor)</div>
                  <div className="text-slate-400 text-[10px]">Flight Duration: ~{tube.transferDurationDays} days</div>
                </div>
                <button
                  onClick={() => previewManifold(`${tube.originLagrangePoint} Tube`)}
                  className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded"
                >
                  Inspect
                </button>
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
