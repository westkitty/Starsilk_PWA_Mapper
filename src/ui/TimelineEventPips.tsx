/**
 * Timeline Event Milestone Pips.
 *
 * Invariants:
 * - Navigable, interactive milestone pips reflecting actual ConsequenceEvent data.
 * - Category-specific color accents (collision/catastrophe crimson, warning amber, fork cyan, starsilk purple, creation emerald).
 * - Clusters events occurring within close temporal proximity (within ~2% of timeline window).
 * - S Pen hover and touch/click reveals compact cyber-obsidian popover showing event title, timestamp, severity, and description.
 * - Strictly non-mutating: inspecting events never alters simulation state.
 */

import React, { useState, useRef } from 'react';
import { ConsequenceEvent } from '../simulation/types';
import { formatSimTime } from '../simulation/units';

interface TimelineEventPipsProps {
  events: ConsequenceEvent[];
  currentSimTimeSec: number;
}

interface ClusteredPip {
  id: string;
  normalizedPosition: number; // 0.0 to 1.0
  events: ConsequenceEvent[];
  dominantSeverity: 'info' | 'caution' | 'catastrophe';
  primaryColor: string;
}

function getEventColor(type: ConsequenceEvent['type'], severity: ConsequenceEvent['severity']): string {
  if (severity === 'catastrophe' || type === 'collision' || type === 'heliocide_triggered') {
    return '#ff3344'; // Crimson
  }
  if (severity === 'caution' || type === 'roche_violation' || type === 'hill_instability' || type === 'orbit_unbound') {
    return '#f59e0b'; // Amber
  }
  if (type === 'branch_fork') {
    return '#49e7ff'; // Cyan
  }
  if (type === 'starsilk_pull') {
    return '#c084fc'; // Purple
  }
  if (type === 'body_created' || type === 'throw_released') {
    return '#10b981'; // Emerald
  }
  if (type === 'siege_wall_locked' || type === 'hookshot_latched') {
    return '#d4a373'; // Gold
  }
  return '#0cc6ff'; // Azure default
}

export const TimelineEventPips: React.FC<TimelineEventPipsProps> = ({
  events,
  currentSimTimeSec,
}) => {
  const [activePip, setActivePip] = useState<ClusteredPip | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!events || events.length === 0) {
    return null;
  }

  // Calculate timeline span: from 0 to max(currentSimTimeSec, maxEventTime, 60)
  const maxEventTime = events.reduce((max, ev) => Math.max(max, ev.timestampSec), 0);
  const maxTime = Math.max(currentSimTimeSec, maxEventTime, 60.0);

  // Cluster events that are within 2.5% of timeline span
  const clusterThresholdNorm = 0.025;
  const sortedEvents = [...events].sort((a, b) => a.timestampSec - b.timestampSec);
  const clusters: ClusteredPip[] = [];

  for (const ev of sortedEvents) {
    const norm = Math.max(0, Math.min(1.0, ev.timestampSec / maxTime));
    const lastCluster = clusters[clusters.length - 1];

    if (lastCluster && Math.abs(lastCluster.normalizedPosition - norm) <= clusterThresholdNorm) {
      lastCluster.events.push(ev);
      // Elevate severity if higher
      if (ev.severity === 'catastrophe') {
        lastCluster.dominantSeverity = 'catastrophe';
        lastCluster.primaryColor = '#ff3344';
      } else if (ev.severity === 'caution' && lastCluster.dominantSeverity !== 'catastrophe') {
        lastCluster.dominantSeverity = 'caution';
        lastCluster.primaryColor = '#f59e0b';
      }
    } else {
      clusters.push({
        id: `pip-${ev.id}-${ev.timestampSec}`,
        normalizedPosition: norm,
        events: [ev],
        dominantSeverity: ev.severity,
        primaryColor: getEventColor(ev.type, ev.severity),
      });
    }
  }

  return (
    <div
      ref={containerRef}
      className="timeline-event-track hud-interactive"
      style={{
        position: 'relative',
        width: '100%',
        height: '14px',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(3, 7, 16, 0.65)',
        borderTop: '1px solid rgba(12, 198, 255, 0.12)',
        borderBottom: '1px solid rgba(12, 198, 255, 0.12)',
        userSelect: 'none',
        marginBottom: '4px',
      }}
      onPointerLeave={() => setActivePip(null)}
    >
      {/* Elapsed time fill indicator */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.min(100, (currentSimTimeSec / maxTime) * 100)}%`,
          background: 'rgba(12, 198, 255, 0.07)',
          pointerEvents: 'none',
        }}
      />

      {/* Clustered Event Pips */}
      {clusters.map((pip) => {
        const isCluster = pip.events.length > 1;
        const isSelected = activePip?.id === pip.id;
        const leftPercent = `${(pip.normalizedPosition * 100).toFixed(2)}%`;

        return (
          <div
            key={pip.id}
            onClick={(e) => {
              e.stopPropagation();
              setActivePip(activePip?.id === pip.id ? null : pip);
            }}
            onPointerEnter={(e) => {
              // S Pen hover or mouse hover triggers instant preview
              if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
                setActivePip(pip);
              }
            }}
            style={{
              position: 'absolute',
              left: leftPercent,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isCluster ? '16px' : '10px',
              height: '10px',
              borderRadius: isCluster ? '4px' : '50%',
              background: pip.primaryColor,
              boxShadow: isSelected
                ? `0 0 8px ${pip.primaryColor}`
                : `0 0 3px ${pip.primaryColor}88`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: isSelected ? 30 : 20,
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            title={`${pip.events.length} event(s) @ ${formatSimTime(pip.events[0].timestampSec)}`}
            role="button"
            aria-label={`Milestone: ${pip.events.map(ev => ev.title).join(', ')}`}
          >
            {isCluster && (
              <span
                style={{
                  fontSize: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: '#03050a',
                  lineHeight: 1,
                }}
              >
                {pip.events.length}
              </span>
            )}
          </div>
        );
      })}

      {/* Active Pip Popover Surface */}
      {activePip && (
        <div
          className="pip-detail-surface"
          style={{
            position: 'absolute',
            bottom: '22px',
            left: `${Math.max(12, Math.min(88, activePip.normalizedPosition * 100))}%`,
            transform: 'translateX(-50%)',
            width: '280px',
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'rgba(5, 13, 23, 0.96)',
            border: `1px solid ${activePip.primaryColor}`,
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
            padding: '10px 12px',
            zIndex: 100,
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
              borderBottom: '1px solid rgba(12, 198, 255, 0.15)',
              paddingBottom: '4px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: activePip.primaryColor,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {activePip.events.length > 1
                ? `${activePip.events.length} EVENTS CLUSTER`
                : activePip.events[0].type.replace(/_/g, ' ')}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              {formatSimTime(activePip.events[0].timestampSec)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activePip.events.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getEventColor(ev.type, ev.severity),
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {ev.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    paddingLeft: '12px',
                    lineHeight: 1.35,
                  }}
                >
                  {ev.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
