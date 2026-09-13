/**
 * UI10: Theme Selector.
 * Switches visual accents between Obsidian Deep Space, Tactical Cyan, and Amber Solar.
 */

import React from "react";

export type AstrometricTheme = "obsidian" | "tactical" | "amber";

interface Props {
  currentTheme: AstrometricTheme;
  onSelectTheme: (theme: AstrometricTheme) => void;
}

export const ThemeSelector: React.FC<Props> = ({ currentTheme, onSelectTheme }) => {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {(["obsidian", "tactical", "amber"] as AstrometricTheme[]).map((theme) => (
        <button
          key={theme}
          onClick={() => onSelectTheme(theme)}
          style={{
            padding: "3px 8px",
            fontSize: "10px",
            borderRadius: "4px",
            background: currentTheme === theme ? "#38bdf8" : "#0f172a",
            color: currentTheme === theme ? "#020617" : "#94a3b8",
            border: "1px solid #334155",
            cursor: "pointer",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {theme}
        </button>
      ))}
    </div>
  );
};
