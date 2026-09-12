import React from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { FittedOrbit } from "../interaction/orbit-loom";

export interface LiveManipulationStats {
  mode: "grab_throw" | "orbit_loom";
  bodyName: string;
  velocityKmS?: number;
  deltaVKmS?: number;
  semiMajorAxisKm?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  periodHours?: number;
  isBound?: boolean;
}

interface ManipulationTelemetryProps {
  stats: LiveManipulationStats | null;
  fittedOrbit: FittedOrbit | null;
}

export const ManipulationTelemetry: React.FC<ManipulationTelemetryProps> = ({ stats, fittedOrbit }) => {
  if (!stats && !fittedOrbit) return null;

  const isBound = fittedOrbit ? fittedOrbit.isBound : (stats?.isBound ?? true);
  const ecc = fittedOrbit ? fittedOrbit.eccentricity : (stats?.eccentricity ?? 0);
  const sma = fittedOrbit ? fittedOrbit.semiMajorAxisKm : (stats?.semiMajorAxisKm ?? 0);
  const inc = fittedOrbit ? fittedOrbit.inclinationDeg : (stats?.inclinationDeg ?? 0);
  const vel = stats?.velocityKmS ?? (fittedOrbit ? Math.hypot(fittedOrbit.periapsisVelocityKmS.x, fittedOrbit.periapsisVelocityKmS.y, fittedOrbit.periapsisVelocityKmS.z) : 0);
  const deltaV = stats?.deltaVKmS;

  return (
    <div
      className="manipulation-telemetry-hud cyber-obsidian-panel"
      style={{
        position: "absolute",
        top: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontSize: "10px",
        zIndex: 25,
        border: `1px solid ${isBound ? "rgba(12, 198, 255, 0.4)" : "rgba(239, 68, 68, 0.5)"}`,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 800, color: isBound ? "var(--accent-azure)" : "#ef4444" }}>
        <Activity size={13} />
        <span>{stats?.bodyName ? stats.bodyName.toUpperCase() : "LIVE MANIPULATION"}</span>
      </div>

      <div style={{ display: "flex", gap: "10px", color: "var(--text-secondary)" }}>
        {vel > 0 && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>v: </span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{vel.toFixed(1)} km/s</span>
          </div>
        )}

        {deltaV !== undefined && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>Δv: </span>
            <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{deltaV.toFixed(1)} km/s</span>
          </div>
        )}

        {sma > 0 && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>a: </span>
            <span style={{ fontWeight: 700 }}>{Math.round(sma).toLocaleString()} km</span>
          </div>
        )}

        <div>
          <span style={{ color: "var(--text-muted)" }}>e: </span>
          <span style={{ fontWeight: 700, color: ecc < 1 ? "var(--accent-azure)" : "#ef4444" }}>{ecc.toFixed(3)}</span>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>i: </span>
          <span style={{ fontWeight: 700 }}>{inc.toFixed(1)}°</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 800, fontSize: "9px" }}>
        {isBound ? (
          <span style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: "3px" }}>
            <CheckCircle2 size={11} /> BOUND
          </span>
        ) : (
          <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "3px" }}>
            <AlertTriangle size={11} /> ESCAPE
          </span>
        )}
      </div>
    </div>
  );
};
