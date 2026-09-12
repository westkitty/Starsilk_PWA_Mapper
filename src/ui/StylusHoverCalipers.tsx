import React from 'react';
import { CelestialBody, Vector3D } from '../simulation/types';
import { KM_PER_AU } from '../simulation/units';

export interface StylusHoverState {
  screenX: number;
  screenY: number;
  worldPos?: Vector3D | null;
  hoveredBody?: CelestialBody | null;
  nearestBody?: CelestialBody | null;
  selectedBody?: CelestialBody | null;
  distanceToNearestKm?: number;
  distanceToSelectedKm?: number;
}

interface StylusHoverCalipersProps {
  hover: StylusHoverState | null;
}

export const StylusHoverCalipers: React.FC<StylusHoverCalipersProps> = ({ hover }) => {
  if (!hover) return null;

  const { screenX, screenY, hoveredBody, nearestBody, selectedBody, distanceToNearestKm, distanceToSelectedKm, worldPos } = hover;

  // Format distance in AU or km
  const formatDist = (km?: number): string => {
    if (km === undefined || km === null || !isFinite(km)) return '--';
    const au = km / KM_PER_AU;
    if (au >= 0.05) {
      return `${au.toFixed(3)} AU`;
    }
    return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
  };

  return (
    <div
      className="stylus-hover-container"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 90,
      }}
    >
      {/* Delicate Stylus Crosshair Reticle */}
      <div
        className="stylus-reticle"
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: 'translate(-50%, -50%)',
          width: '28px',
          height: '28px',
          border: '0.8px solid rgba(12, 198, 255, 0.85)',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(12, 198, 255, 0.3)',
          pointerEvents: 'none',
        }}
      >
        {/* Cardinal crosshairs */}
        <div style={{ position: 'absolute', top: '-4px', left: '13px', width: '1px', height: '5px', background: '#0cc6ff' }} />
        <div style={{ position: 'absolute', bottom: '-4px', left: '13px', width: '1px', height: '5px', background: '#0cc6ff' }} />
        <div style={{ position: 'absolute', left: '-4px', top: '13px', width: '5px', height: '1px', background: '#0cc6ff' }} />
        <div style={{ position: 'absolute', right: '-4px', top: '13px', width: '5px', height: '1px', background: '#0cc6ff' }} />
        <div style={{ position: 'absolute', left: '13px', top: '13px', width: '2px', height: '2px', background: '#0cc6ff', borderRadius: '50%' }} />
      </div>

      {/* Floating Spatial Calipers Card */}
      <div
        className="stylus-calipers-card cyber-obsidian-panel"
        style={{
          position: 'absolute',
          left: `${screenX + 24}px`,
          top: `${Math.max(64, screenY - 50)}px`,
          minWidth: '190px',
          padding: '8px 12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-secondary)',
          background: 'rgba(6, 10, 18, 0.92)',
          border: '1px solid rgba(12, 198, 255, 0.35)',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none',
          lineHeight: 1.45,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(12, 198, 255, 0.18)', paddingBottom: '3px', marginBottom: '5px' }}>
          <span style={{ color: '#0cc6ff', fontWeight: 600, fontSize: '9px', letterSpacing: '0.08em' }}>S PEN CALIPERS</span>
          <span style={{ color: 'rgba(12, 198, 255, 0.6)', fontSize: '9px' }}>INSPECTION</span>
        </div>

        {hoveredBody ? (
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '12px' }}>{hoveredBody.name}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '9px', textTransform: 'uppercase' }}>{hoveredBody.type}</div>
            <div style={{ marginTop: '4px' }}>
              <div>r: <span style={{ color: '#e2e8f0' }}>{formatDist(Math.hypot(hoveredBody.position.x, hoveredBody.position.y, hoveredBody.position.z))}</span></div>
              <div>v: <span style={{ color: '#e2e8f0' }}>{Math.hypot(hoveredBody.velocity.x, hoveredBody.velocity.y, hoveredBody.velocity.z).toFixed(2)} km/s</span></div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>ORBITAL PLANE</div>
            {worldPos && (
              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                <div>X: {(worldPos.x / KM_PER_AU).toFixed(3)} AU</div>
                <div>Z: {(worldPos.z / KM_PER_AU).toFixed(3)} AU</div>
              </div>
            )}
            {selectedBody && distanceToSelectedKm !== undefined && (
              <div style={{ marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '3px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Δ to {selectedBody.name}: </span>
                <span style={{ color: '#0cc6ff' }}>{formatDist(distanceToSelectedKm)}</span>
              </div>
            )}
            {!selectedBody && nearestBody && distanceToNearestKm !== undefined && (
              <div style={{ marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '3px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Δ to {nearestBody.name}: </span>
                <span style={{ color: '#f59e0b' }}>{formatDist(distanceToNearestKm)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
