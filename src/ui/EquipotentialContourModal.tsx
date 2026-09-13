import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { RocheLobeOverflowSolver } from '../simulation/roche-lobe-overflow';
import { EventBus } from '../core/event-bus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const EquipotentialContourModal: React.FC<Props> = ({ isOpen, onClose, bodies }) => {
  if (!isOpen) return null;

  const star1 = bodies[0];
  const star2 = bodies[1];

  const report = useMemo(() => {
    if (!star1 || !star2) return null;
    const m1 = star1.massKg ? star1.massKg / 1.989e30 : (star1.mass || 1.0);
    const m2 = star2.massKg ? star2.massKg / 1.989e30 : (star2.mass || 0.5);
    const dx = star1.position.x - star2.position.x;
    const dy = star1.position.y - star2.position.y;
    const dz = star1.position.z - star2.position.z;
    const sepKm = Math.hypot(dx, dy, dz) * 1.496e8;
    const r1Km = star1.radiusKm || ((star1.radius || 1) * 696340);
    return RocheLobeOverflowSolver.calculateRocheLobe(m1, m2, sepKm, r1Km);
  }, [star1, star2]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-amber-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>⚯</span> Roche Lobe & Jacobi Equipotential
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {star1 && star2 && report ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Binary Primary:</span>
              <span className="font-bold text-amber-300">{star1.name}</span>
            </div>
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Binary Secondary:</span>
              <span className="font-bold text-cyan-300">{star2.name}</span>
            </div>

            <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
              <div className="flex justify-between">
                <span>Roche Lobe Radius (r_L1):</span>
                <span className="text-amber-300 font-bold">{(report.rL1RadiusKm / 1e6).toFixed(2)} million km</span>
              </div>
              <div className="flex justify-between">
                <span>Separation Fraction:</span>
                <span className="text-slate-300 font-semibold">{(report.rL1SeparationFraction * 100).toFixed(1)}% of a</span>
              </div>
            </div>

            <div className={`p-3 rounded border ${report.isOverflowing ? 'bg-rose-950/40 border-rose-500/50' : 'bg-emerald-950/40 border-emerald-500/50'}`}>
              <div className="font-semibold text-slate-200">Mass Transfer (RLOF):</div>
              <div className="text-[11px] mt-1 text-slate-300">
                {report.isOverflowing ? `⚠️ Active L1 overflow stream: ${report.massTransferRateSolarMassesPerYear.toExponential(2)} M☉/yr` : '✅ Detached binary: Both stars contained within respective Roche lobes'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Requires at least two celestial bodies</div>
        )}

        <div className="mt-6 flex justify-between items-center">
          {star1 && star2 && (
            <button
              onClick={() => {
                EventBus.emit('scene:toggle_roche_lobes', { visible: true });
                EventBus.emit('ui:toast', {
                  type: 'info',
                  message: `Roche Lobe equipotentials wireframe rendered in 3D scene`,
                });
              }}
              className="px-3 py-1.5 bg-amber-800/60 hover:bg-amber-700/80 text-amber-200 border border-amber-600/40 rounded transition"
            >
              Visualize 3D Roche Lobes
            </button>
          )}
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded ml-auto">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
