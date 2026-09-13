import React from 'react';
import { CelestialBody } from '../simulation/types';
import { calculateOsculatingElements } from '../simulation/orbital-mechanics';

interface ApsidesOverlayProps {
  selectedBody: CelestialBody | null;
  primaryBody: CelestialBody | null;
}

export const ApsidesOverlay: React.FC<ApsidesOverlayProps> = ({
  selectedBody,
  primaryBody,
}) => {
  if (!selectedBody || !primaryBody || selectedBody.id === primaryBody.id) {
    return null;
  }

  const elements = calculateOsculatingElements(selectedBody, primaryBody);
  const periapsisKm = elements.periapsisKm;
  const apoapsisKm = elements.apoapsisKm;

  return (
    <div className="flex items-center space-x-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs backdrop-blur">
      <div>
        <span className="text-slate-400">Periapsis (q): </span>
        <span className="font-mono text-emerald-400 font-semibold">{(periapsisKm / 1e6).toFixed(2)} Mkm</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div>
        <span className="text-slate-400">Apoapsis (Q): </span>
        <span className="font-mono text-sky-400 font-semibold">
          {elements.eccentricity >= 1 ? '∞ (Hyperbolic)' : `${(apoapsisKm / 1e6).toFixed(2)} Mkm`}
        </span>
      </div>
    </div>
  );
};
