import React from 'react';

interface InclinationCaliperProps {
  currentElevationDeg?: number;
  onSnapEcliptic?: () => void;
  onSnapPolar?: () => void;
}

export const InclinationCaliper: React.FC<InclinationCaliperProps> = ({
  currentElevationDeg = 45,
  onSnapEcliptic,
  onSnapPolar,
}) => {
  return (
    <div className="flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 backdrop-blur shadow-md text-xs text-slate-300">
      <span className="text-slate-400 font-mono">∠ {Math.abs(Math.round(currentElevationDeg))}°</span>

      <div className="h-3 w-px bg-slate-700" />

      {onSnapEcliptic && (
        <button
          onClick={onSnapEcliptic}
          title="Snap camera to ecliptic plane (0°)"
          className="hover:text-sky-400 font-medium transition"
        >
          Ecliptic
        </button>
      )}

      {onSnapPolar && (
        <button
          onClick={onSnapPolar}
          title="Snap camera to polar overhead (90°)"
          className="hover:text-purple-400 font-medium transition"
        >
          Polar
        </button>
      )}
    </div>
  );
};
