import React, { useEffect, useState } from 'react';
import { perfMonitor } from '../core/perf-monitor';

interface PerfOverlayProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PerfOverlay: React.FC<PerfOverlayProps> = ({ isVisible, onToggle }) => {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const summary = perfMonitor.getSummary();
      setFps(Math.round(summary.fps));
      setFrameTime(parseFloat(summary.averageFrameTimeMs.toFixed(1)));
    }, 250);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-14 right-4 z-40 flex flex-col rounded-lg border border-slate-700/80 bg-slate-950/90 p-3 shadow-xl backdrop-blur font-mono text-xs text-slate-300 min-w-[140px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
        <span className="font-bold text-sky-400">TELEMETRY</span>
        <button onClick={onToggle} className="text-slate-500 hover:text-slate-300">✕</button>
      </div>

      <div className="flex justify-between">
        <span className="text-slate-500">FPS:</span>
        <span className={`font-bold ${fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
          {fps}
        </span>
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-slate-500">Frame:</span>
        <span className="text-slate-200">{frameTime} ms</span>
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-slate-500">Engine:</span>
        <span className="text-emerald-400">RK4 Float64</span>
      </div>
    </div>
  );
};
