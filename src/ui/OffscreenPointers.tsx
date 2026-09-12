import React from "react";
import { Navigation } from "lucide-react";
import { CelestialBody } from "../simulation/types";
import { SceneManager } from "../rendering/scene-manager";

interface OffscreenPointersProps {
  selectedBody: CelestialBody | null;
  sceneManager: SceneManager | null;
  viewportWidth: number;
  viewportHeight: number;
  onFocusBody: (body: CelestialBody) => void;
}

export const OffscreenPointers: React.FC<OffscreenPointersProps> = ({
  selectedBody,
  sceneManager,
  viewportWidth,
  viewportHeight,
  onFocusBody,
}) => {
  if (!selectedBody || !sceneManager) return null;

  const screenPos = sceneManager.getBodyScreenPosition(selectedBody.id);
  if (!screenPos) return null;

  const padding = 28;
  const isOffscreen =
    screenPos.x < padding ||
    screenPos.x > viewportWidth - padding ||
    screenPos.y < padding ||
    screenPos.y > viewportHeight - padding;

  if (!isOffscreen) return null;

  // Clamp screen coordinates to viewport perimeter
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  const dx = screenPos.x - cx;
  const dy = screenPos.y - cy;

  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Intersect ray from center with viewport rectangle bounds
  const halfW = viewportWidth / 2 - padding;
  const halfH = viewportHeight / 2 - padding;

  const scale = Math.min(
    Math.abs(halfW / (dx || 0.0001)),
    Math.abs(halfH / (dy || 0.0001))
  );

  const edgeX = cx + dx * scale;
  const edgeY = cy + dy * scale;

  return (
    <div
      className="offscreen-pointer hud-interactive cyber-obsidian-panel"
      onClick={() => onFocusBody(selectedBody)}
      style={{
        position: "absolute",
        left: `${edgeX}px`,
        top: `${edgeY}px`,
        transform: "translate(-50%, -50%)",
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        cursor: "pointer",
        zIndex: 30,
        fontSize: "10px",
        fontWeight: 800,
        color: "var(--accent-azure)",
        borderRadius: "14px",
        boxShadow: "0 0 14px rgba(12, 198, 255, 0.4)",
      }}
      title={`Off-screen: Click to frame ${selectedBody.name}`}
    >
      <div style={{ transform: `rotate(${angleDeg + 90}deg)`, display: "flex", alignItems: "center" }}>
        <Navigation size={12} fill="var(--accent-azure)" color="var(--accent-azure)" />
      </div>
      <span>{selectedBody.name}</span>
    </div>
  );
};
