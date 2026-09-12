import React from "react";
import { ScaleMode } from "../rendering/scale-transform";
import { KM_PER_AU } from "../simulation/units";

interface ScaleBarProps {
  cameraDistance: number;
  scaleMode: ScaleMode;
  viewportHeight: number;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({ cameraDistance, scaleMode, viewportHeight }) => {
  // Approximate world units per pixel at camera focal plane (fov 45 deg)
  const fovRad = (45 * Math.PI) / 180;
  const worldUnitsPerPixel = (2 * cameraDistance * Math.tan(fovRad / 2)) / Math.max(400, viewportHeight);

  // Target scale bar pixel width around 100px
  const targetUnits = worldUnitsPerPixel * 100;

  // Convert to kilometers
  // In true scale: 1 unit = KM_PER_AU / 1000 km
  const kmPerUnit = KM_PER_AU / 1000.0;
  const rawKm = targetUnits * kmPerUnit;

  let displayValue = "";
  let barWidthPx = 100;

  if (rawKm >= KM_PER_AU * 0.8) {
    const au = rawKm / KM_PER_AU;
    const roundedAu = au >= 10 ? Math.round(au) : (au >= 1 ? Number(au.toFixed(1)) : Number(au.toFixed(2)));
    displayValue = `${roundedAu} AU`;
    const adjustedUnits = (roundedAu * KM_PER_AU) / kmPerUnit;
    barWidthPx = Math.max(40, Math.min(180, Math.round(adjustedUnits / worldUnitsPerPixel)));
  } else if (rawKm >= 1000000) {
    const mkm = Math.round(rawKm / 1000000);
    displayValue = `${mkm} Mkm`;
    const adjustedUnits = (mkm * 1000000) / kmPerUnit;
    barWidthPx = Math.max(40, Math.min(180, Math.round(adjustedUnits / worldUnitsPerPixel)));
  } else if (rawKm >= 1000) {
    const kkm = Math.round(rawKm / 1000);
    displayValue = `${kkm.toLocaleString()} km`;
    const adjustedUnits = (kkm * 1000) / kmPerUnit;
    barWidthPx = Math.max(40, Math.min(180, Math.round(adjustedUnits / worldUnitsPerPixel)));
  } else {
    const km = Math.max(1, Math.round(rawKm));
    displayValue = `${km} km`;
    const adjustedUnits = km / kmPerUnit;
    barWidthPx = Math.max(40, Math.min(180, Math.round(adjustedUnits / worldUnitsPerPixel)));
  }

  const modeNotice = scaleMode === "readable" ? "READABLE DISPLAY" : "PHYSICAL 1:1";

  return (
    <div
      className="scale-bar cyber-obsidian-panel"
      style={{
        position: "absolute",
        bottom: "84px",
        left: "80px",
        padding: "4px 8px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        fontSize: "9px",
        color: "var(--text-secondary)",
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontWeight: 700 }}>
        <span style={{ color: "var(--accent-azure)" }}>{displayValue}</span>
        <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{modeNotice}</span>
      </div>
      <div
        style={{
          width: `${barWidthPx}px`,
          height: "3px",
          background: "var(--accent-azure)",
          borderLeft: "2px solid #fff",
          borderRight: "2px solid #fff",
          borderRadius: "1px",
        }}
      />
    </div>
  );
};
