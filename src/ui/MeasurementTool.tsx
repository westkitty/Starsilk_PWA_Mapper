import React, { useState } from "react";
import { Ruler, X, ArrowRight, Clock, Gauge } from "lucide-react";
import { CelestialBody } from "../simulation/types";
import { KM_PER_AU, SPEED_OF_LIGHT_KM_S } from "../simulation/units";

interface MeasurementToolProps {
  bodies: CelestialBody[];
  selectedBodyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  bodies,
  selectedBodyId,
  isOpen,
  onClose,
}) => {
  const [bodyAId, setBodyAId] = useState<string>(selectedBodyId || bodies[0]?.id || "");
  const [bodyBId, setBodyBId] = useState<string>(bodies[1]?.id || "");

  if (!isOpen) return null;

  const bodyA = bodies.find(b => b.id === bodyAId);
  const bodyB = bodies.find(b => b.id === bodyBId);

  let centerDistanceKm = 0;
  let surfaceSeparationKm: number | null = null;
  let lightTravelTimeSec = 0;
  let relativeSpeedKmS = 0;

  if (bodyA && bodyB && bodyA.id !== bodyB.id) {
    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;
    const dz = bodyB.position.z - bodyA.position.z;
    centerDistanceKm = Math.hypot(dx, dy, dz);

    const sumRadii = (bodyA.radiusKm || 0) + (bodyB.radiusKm || 0);
    surfaceSeparationKm = Math.max(0, centerDistanceKm - sumRadii);

    lightTravelTimeSec = centerDistanceKm / (SPEED_OF_LIGHT_KM_S || 299792.458);

    const dvx = bodyB.velocity.x - bodyA.velocity.x;
    const dvy = bodyB.velocity.y - bodyA.velocity.y;
    const dvz = bodyB.velocity.z - bodyA.velocity.z;
    relativeSpeedKmS = Math.hypot(dvx, dvy, dvz);
  }

  const formatDistance = (km: number) => {
    if (km >= KM_PER_AU * 0.1) {
      return `${(km / KM_PER_AU).toFixed(3)} AU (${Math.round(km).toLocaleString()} km)`;
    }
    return `${Math.round(km).toLocaleString()} km`;
  };

  const formatLightTime = (sec: number) => {
    if (sec < 0.001) return "< 1 ms";
    if (sec < 60) return `${sec.toFixed(2)} s`;
    const mins = Math.floor(sec / 60);
    const remSec = (sec % 60).toFixed(1);
    return `${mins}m ${remSec}s`;
  };

  return (
    <div
      className="measurement-tool-card cyber-obsidian-panel hud-interactive"
      style={{
        position: "absolute",
        top: "70px",
        left: "76px",
        width: "280px",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 25,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, color: "var(--accent-azure)" }}>
          <Ruler size={14} />
          <span>ANALYTICAL MEASUREMENT</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <select
          value={bodyAId}
          onChange={(e) => setBodyAId(e.target.value)}
          className="hud-select"
          style={{ flex: 1, fontSize: "10px", padding: "4px" }}
        >
          {bodies.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <ArrowRight size={12} color="var(--text-muted)" />
        <select
          value={bodyBId}
          onChange={(e) => setBodyBId(e.target.value)}
          className="hud-select"
          style={{ flex: 1, fontSize: "10px", padding: "4px" }}
        >
          {bodies.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {bodyA && bodyB && bodyA.id !== bodyB.id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px", marginTop: "2px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Center-to-Center:</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatDistance(centerDistanceKm)}</span>
          </div>
          {surfaceSeparationKm !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Surface Separation:</span>
              <span style={{ fontWeight: 700, color: "#38bdf8" }}>{formatDistance(surfaceSeparationKm)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={11} /> Light Travel Time:
            </span>
            <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{formatLightTime(lightTravelTimeSec)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Gauge size={11} /> Relative Velocity:
            </span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{relativeSpeedKmS.toFixed(2)} km/s</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center", padding: "6px" }}>
          Select two distinct celestial bodies to inspect physical separation.
        </div>
      )}
    </div>
  );
};
