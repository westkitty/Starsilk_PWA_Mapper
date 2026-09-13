/**
 * UI05: Astrometric System Overview & Stats Modal.
 */

import React from "react";
import { CelestialBody } from "../simulation/types";
import { formatMass, formatDistance } from "../simulation/units";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
}

export const SystemStatsModal: React.FC<Props> = ({ isOpen, onClose, bodies }) => {
  if (!isOpen) return null;

  const totalMass = bodies.reduce((sum, b) => sum + b.massKg, 0);

  // Barycenter calculation
  let cx = 0, cy = 0, cz = 0;
  for (const b of bodies) {
    cx += b.position.x * b.massKg;
    cy += b.position.y * b.massKg;
    cz += b.position.z * b.massKg;
  }
  const barycenter = {
    x: totalMass > 0 ? cx / totalMass : 0,
    y: totalMass > 0 ? cy / totalMass : 0,
    z: totalMass > 0 ? cz / totalMass : 0,
  };
  const baryDist = Math.hypot(barycenter.x, barycenter.y, barycenter.z);

  const starCount = bodies.filter(b => b.type === "star" || b.type === "black_hole").length;
  const planetCount = bodies.filter(b => b.type === "planet").length;
  const moonCount = bodies.filter(b => b.type === "moon").length;
  const stationCount = bodies.filter(b => b.type === "station").length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>Astrometric System Statistics</h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "6px", border: "1px solid #1e293b" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>TOTAL BODIES</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f8fafc" }}>{bodies.length}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              {starCount} stars, {planetCount} planets, {moonCount} moons
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "6px", border: "1px solid #1e293b" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>TOTAL MASS</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f8fafc" }}>{formatMass(totalMass)}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Barycenter offset: {formatDistance(baryDist)}
            </div>
          </div>
        </div>

        <div style={{ background: "#0f172a", padding: "12px", borderRadius: "6px", border: "1px solid #1e293b", fontSize: "12px" }}>
          <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: "6px" }}>System Inventory</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e293b" }}>
            <span>Artificial Stations</span>
            <span>{stationCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>Barycentric Coordinates</span>
            <span>({barycenter.x.toFixed(0)}, {barycenter.y.toFixed(0)}, {barycenter.z.toFixed(0)}) km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
