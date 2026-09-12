import React from "react";
import { Waves } from "lucide-react";
import { CelestialBody } from "../simulation/types";
import { detectMeanMotionResonances } from "../simulation/orbital-mechanics";

interface ResonanceBadgeProps {
  selectedBody: CelestialBody | null;
  allBodies: CelestialBody[];
}

export const ResonanceBadge: React.FC<ResonanceBadgeProps> = ({ selectedBody, allBodies }) => {
  if (!selectedBody || allBodies.length < 2) return null;

  const resonances = detectMeanMotionResonances(allBodies);
  const matched = resonances.filter(
    r => r.bodyAId === selectedBody.id || r.bodyBId === selectedBody.id
  );

  if (matched.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
      {matched.map((r, idx) => {
        const otherId = r.bodyAId === selectedBody.id ? r.bodyBId : r.bodyAId;
        const otherBody = allBodies.find(b => b.id === otherId);
        const ratioStr = `${r.ratio.p}:${r.ratio.q}`;
        const diffPercent = (r.deltaPeriodFraction * 100).toFixed(1);

        return (
          <div
            key={idx}
            className="resonance-badge cyber-obsidian-panel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              fontSize: "9px",
              borderRadius: "4px",
              background: "rgba(12, 198, 255, 0.08)",
              border: "1px solid rgba(12, 198, 255, 0.3)",
            }}
            title={`Mean-Motion Orbital Resonance ${ratioStr} with ${otherBody?.name || "partner"}`}
          >
            <Waves size={12} color="#0cc6ff" />
            <span style={{ fontWeight: 800, color: "var(--accent-azure)" }}>{ratioStr} RESONANCE</span>
            <span style={{ color: "var(--text-secondary)" }}>with {otherBody?.name || "primary"}</span>
            <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>(Δ {diffPercent}%)</span>
          </div>
        );
      })}
    </div>
  );
};
