import React, { useMemo } from 'react';
import { CelestialBody } from '../simulation/types';
import { MagnetosphereSolver } from '../simulation/magnetosphere';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId?: string;
}

export const MagnetosphereModal: React.FC<Props> = ({ isOpen, onClose, bodies, selectedBodyId }) => {
  if (!isOpen) return null;

  const planet = useMemo(() => {
    return bodies.find(b => b.id === selectedBodyId && b.type !== 'star') || bodies[1] || bodies[0];
  }, [bodies, selectedBodyId]);

  const profile = useMemo(() => {
    if (!planet) return null;
    const m = planet.massKg ? planet.massKg / 5.972e24 : (planet.mass || 1.0);
    const dipole = m * 8e22; // Earth proxy dipole moment
    const rKm = planet.radiusKm || ((planet.radius || 1) * 6371);
    return MagnetosphereSolver.calculateMagnetopause(dipole, rKm);
  }, [planet]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 border border-sky-500/40 rounded-xl p-6 max-w-md w-full text-slate-100 shadow-2xl shadow-sky-950/60 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
          <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
            <span>🛡️</span> Magnetosphere & Bow Shock
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
        </div>

        {planet && profile ? (
          <div className="space-y-3">
            <div className="flex justify-between bg-slate-800/60 p-2 rounded">
              <span className="text-slate-400">Planet:</span>
              <span className="font-bold text-sky-300">{planet.name}</span>
            </div>

            <div className="bg-slate-800/40 p-3 rounded space-y-2 border border-slate-700/40">
              <div className="flex justify-between">
                <span>Magnetopause Stand-off:</span>
                <span className="text-sky-300 font-bold">{profile.standoffRadiusKm.toFixed(0)} km</span>
              </div>
              <div className="flex justify-between">
                <span>Stand-off in Planetary Radii:</span>
                <span className="text-amber-300 font-bold">{profile.standoffInPlanetaryRadii.toFixed(1)} R_p</span>
              </div>
            </div>

            <div className={`p-3 rounded border ${profile.hasProtectiveShield ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-rose-950/40 border-rose-500/50'}`}>
              <div className="font-semibold text-slate-200">Cosmic Ray & Solar Wind Shielding:</div>
              <div className="text-[11px] mt-1 text-slate-300">
                {profile.hasProtectiveShield ? '✅ Active Dynamo: Intrinsic field shields atmosphere against solar sputtering' : '❌ Unshielded: Atmosphere subject to intense solar wind erosion'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Select a planet to inspect magnetic shield</div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
