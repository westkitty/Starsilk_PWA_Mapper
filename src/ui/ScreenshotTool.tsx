import React, { useState } from 'react';
import { eventBus } from '../core/event-bus';

export const ScreenshotTool: React.FC = () => {
  const [capturing, setCapturing] = useState(false);

  const captureCanvas = () => {
    setCapturing(true);
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      setCapturing(false);
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `starsilk_capture_${Date.now()}.png`;
      a.click();

      eventBus.emit('system:toast', {
        title: 'Snapshot Saved',
        message: 'High-resolution PNG exported successfully.',
        type: 'info',
      });
    } catch {
      eventBus.emit('system:toast', {
        title: 'Capture Failed',
        message: 'WebGL buffer could not be captured.',
        type: 'warning',
      });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <button
      onClick={captureCanvas}
      disabled={capturing}
      title="Capture Viewport Screenshot"
      className="flex items-center space-x-1 rounded border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
    >
      <span>📸</span>
      <span>{capturing ? 'Capturing...' : 'Capture'}</span>
    </button>
  );
};
