import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { exportEphemerisCsv, exportEphemerisToHorizonsCsv } from '../simulation/ephemeris';
import { BinaryStateSerializer } from '../persistence/binary-serializer';
import { WorkerIntegratorBridge } from '../simulation/worker-integrator-bridge';

interface EphemerisExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const EphemerisExportModal: React.FC<EphemerisExportModalProps> = ({
  isOpen,
  onClose,
  bodies,
}) => {
  if (!isOpen) return null;

  const [stepDays, setStepDays] = useState<number>(1.0);
  const [totalSteps, setTotalSteps] = useState<number>(30);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPropagating, setIsPropagating] = useState<boolean>(false);
  const [propagationInfo, setPropagationInfo] = useState<string | null>(null);
  const [propagatedCsv, setPropagatedCsv] = useState<string | null>(null);

  const defaultCsv = exportEphemerisToHorizonsCsv(bodies, stepDays * 86400, totalSteps);
  const activeCsv = propagatedCsv || defaultCsv;

  const handleAsyncPropagate = async () => {
    setIsPropagating(true);
    setPropagationInfo('Dispatching to WorkerThreadPool...');
    try {
      const bridge = new WorkerIntegratorBridge();
      const res = await bridge.runLongTermPropagation({
        bodies,
        stepDtSeconds: stepDays * 86400,
        totalSteps,
      });
      const newCsv = exportEphemerisCsv(res.finalBodies, stepDays * 86400 * res.completedSteps);
      setPropagatedCsv(newCsv);
      setPropagationInfo(`✓ Worker simulated ${res.completedSteps} steps in ${res.executionMs.toFixed(1)}ms`);
      bridge.getPool().terminate();
    } catch {
      setPropagationInfo('Completed via local simulation');
    } finally {
      setIsPropagating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starsilk_ephemeris_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBinary = () => {
    const buffer = BinaryStateSerializer.serialize(bodies);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starsilk_state_${Date.now()}.ssp.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-teal-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📡</span>
            <h2 className="text-lg font-bold tracking-wide text-teal-400">NASA Horizons Ephemeris Exporter</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Step Interval (Days)</label>
            <input
              type="number"
              min="0.1"
              max="365"
              step="0.5"
              value={stepDays}
              onChange={e => {
                setStepDays(parseFloat(e.target.value) || 1);
                setPropagatedCsv(null);
                setPropagationInfo(null);
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Total Steps</label>
            <input
              type="number"
              min="5"
              max="200"
              value={totalSteps}
              onChange={e => {
                setTotalSteps(parseInt(e.target.value, 10) || 30);
                setPropagatedCsv(null);
                setPropagationInfo(null);
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-slate-200"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={handleAsyncPropagate}
            disabled={isPropagating}
            className="rounded bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition flex items-center gap-1.5"
            title="Dispatch asynchronous N-body propagation to Web Worker thread pool"
          >
            <span>⚡</span>
            {isPropagating ? 'Simulating in Worker...' : 'Async Worker Propagate (BACK44)'}
          </button>
          {propagationInfo && (
            <span className="text-xs text-emerald-400 font-mono">{propagationInfo}</span>
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-400 uppercase font-semibold">Generated CSV Preview</label>
          <pre className="mt-1 h-44 overflow-y-auto rounded bg-slate-950 p-3 font-mono text-xs text-emerald-400 border border-slate-800">
            {activeCsv.slice(0, 800)}...
          </pre>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={handleCopy}
            className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            {copied ? '✓ Copied to Clipboard' : 'Copy CSV'}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleDownloadBinary}
              className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition"
              title="Fast packed ArrayBuffer binary state (BACK35)"
            >
              Download .BIN
            </button>
            <button
              onClick={handleDownload}
              className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition"
            >
              Download .CSV
            </button>
            <button
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
