import React, { useState } from 'react';
import { EventBus } from '../core/event-bus';

export const RelativisticAberrationToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    EventBus.emit('fx:aberration_toggle', { enabled: next });
    EventBus.emit('ui:toast', {
      type: 'info',
      message: `Relativistic Lorentz/Aberration FX: ${next ? 'ENABLED (1/c²)' : 'DISABLED'}`,
    });
  };

  return (
    <button
      onClick={toggle}
      title="Toggle Relativistic Lorentz & Optical Aberration"
      className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
        enabled
          ? 'bg-purple-900/60 border-purple-400 text-purple-200'
          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      <span>⚡ 1PN FX: {enabled ? 'ON' : 'OFF'}</span>
    </button>
  );
};
