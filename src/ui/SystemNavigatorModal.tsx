/**
 * UI01: Quick System Navigator Modal.
 * Filterable, searchable celestial catalog with 1-click focus targeting.
 */

import React, { useState } from "react";
import { CelestialBody } from "../simulation/types";
import { formatMass, formatRadius, formatDistance } from "../simulation/units";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bodies: CelestialBody[];
  selectedBodyId: string | null;
  onSelectBody: (id: string) => void;
}

export const SystemNavigatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bodies,
  selectedBodyId,
  onSelectBody,
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filtered = bodies.filter((b) => {
    if (filterType !== "all" && b.type !== filterType) return false;
    if (searchQuery.trim()) {
      return b.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>System Navigator</h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search celestial bodies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "6px 12px",
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#e2e8f0",
              borderRadius: "4px"
            }}
          />
          {["all", "star", "planet", "moon", "station"].map((t) => (
            <button
              key={t}
              className={filterType === t ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: "11px", padding: "4px 10px", textTransform: "capitalize" }}
              onClick={() => setFilterType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body List */}
        <div style={{ maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>No matching celestial bodies found.</div>
          )}
          {filtered.map((body) => {
            const isSelected = body.id === selectedBodyId;
            const dist = Math.hypot(body.position.x, body.position.y, body.position.z);
            return (
              <div
                key={body.id}
                onClick={() => {
                  onSelectBody(body.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: isSelected ? "rgba(56, 189, 248, 0.15)" : "#0b1329",
                  border: isSelected ? "1px solid #38bdf8" : "1px solid #1e293b",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: body.color }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "13px" }}>{body.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {body.type.toUpperCase()} • {formatDistance(dist)} from barycenter
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "11px", color: "#cbd5e1" }}>
                  <div>{formatMass(body.massKg)}</div>
                  <div style={{ color: "#64748b" }}>{formatRadius(body.radiusKm)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
