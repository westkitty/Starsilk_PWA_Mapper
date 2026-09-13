import React, { useState } from 'react';
import { CelestialBody } from '../simulation/types';
import { generateShareUrl, encodeSystemToUrl } from '../persistence/url-state';
import { eventBus } from '../core/event-bus';

interface ShareSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemName: string;
  bodies: CelestialBody[];
}

export const ShareSystemModal: React.FC<ShareSystemModalProps> = ({
  isOpen,
  onClose,
  systemName,
  bodies,
}) => {
  if (!isOpen) return null;

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSigil, setCopiedSigil] = useState(false);

  const shareUrl = generateShareUrl(systemName, bodies);
  const sigilCode = encodeSystemToUrl(systemName, bodies);

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedUrl(true);
    eventBus.emit('system:toast', {
      title: 'Link Copied',
      message: 'System share URL copied to clipboard.',
      type: 'info',
    });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copySigil = () => {
    navigator.clipboard.writeText(sigilCode);
    setCopiedSigil(true);
    eventBus.emit('system:toast', {
      title: 'Sigil Copied',
      message: 'Base64 system sigil copied to clipboard.',
      type: 'info',
    });
    setTimeout(() => setCopiedSigil(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-sky-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔗</span>
            <h2 className="text-lg font-bold tracking-wide text-sky-400">Share Star System Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Share your custom star system with others via a direct URL parameter or encoded compact state sigil.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Shareable Deep Link</label>
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-sky-300 select-all"
              />
              <button
                onClick={copyUrl}
                className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 whitespace-nowrap transition"
              >
                {copiedUrl ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Encoded State Sigil</label>
            <div className="mt-1 flex space-x-2">
              <textarea
                readOnly
                rows={3}
                value={sigilCode}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-400 select-all"
              />
              <button
                onClick={copySigil}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap transition"
              >
                {copiedSigil ? 'Copied!' : 'Copy Sigil'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
