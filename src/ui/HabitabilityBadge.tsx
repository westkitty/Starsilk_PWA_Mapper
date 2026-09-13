/**
 * UI11: Habitability & Goldilocks Zone Indicator Badge.
 */

import React from "react";

interface Props {
  temperatureK: number | null | undefined;
}

export const HabitabilityBadge: React.FC<Props> = ({ temperatureK }) => {
  if (temperatureK == null) return null;

  let label = "Temperate (Habitable)";
  let color = "#10b981"; // Emerald
  let bg = "rgba(16, 185, 129, 0.15)";

  if (temperatureK > 373.15) {
    label = "Hyperthermal (Scorched)";
    color = "#ef4444";
    bg = "rgba(239, 68, 68, 0.15)";
  } else if (temperatureK < 240) {
    label = "Cryogenic (Frozen)";
    color = "#38bdf8";
    bg = "rgba(56, 189, 248, 0.15)";
  }

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "3px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 600,
      color,
      background: bg,
      border: `1px solid ${color}`,
      marginTop: "6px"
    }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
      {label} ({Math.round(temperatureK)} K)
    </div>
  );
};
