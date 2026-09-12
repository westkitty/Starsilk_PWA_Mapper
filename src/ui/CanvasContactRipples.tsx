import React, { useEffect } from 'react';

export interface ContactRipple {
  id: number;
  x: number;
  y: number;
}

interface CanvasContactRipplesProps {
  ripples: ContactRipple[];
  onPruneRipple: (id: number) => void;
}

export const CanvasContactRipples: React.FC<CanvasContactRipplesProps> = ({ ripples, onPruneRipple }) => {
  return (
    <div
      className="canvas-contact-ripples-container"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 85,
      }}
    >
      {ripples.map(r => (
        <ContactRippleItem key={r.id} ripple={r} onDone={() => onPruneRipple(r.id)} />
      ))}
    </div>
  );
};

const ContactRippleItem: React.FC<{ ripple: ContactRipple; onDone: () => void }> = ({ ripple, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 140);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="contact-ripple-ring"
      style={{
        position: 'absolute',
        left: `${ripple.x}px`,
        top: `${ripple.y}px`,
        transform: 'translate(-50%, -50%)',
        width: '36px',
        height: '36px',
        border: '1.5px solid #0cc6ff',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(12, 198, 255, 0.6)',
        pointerEvents: 'none',
      }}
    />
  );
};
