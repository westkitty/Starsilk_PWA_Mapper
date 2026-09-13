import React from "react";
import { Compass } from "lucide-react";
import { CameraController } from "../rendering/camera-controller";

import { InclinationCaliper } from "./InclinationCaliper";

interface OrientationCubeProps {
  cameraController: CameraController | null;
}

export const OrientationCube: React.FC<OrientationCubeProps> = ({ cameraController }) => {
  if (!cameraController) return null;

  const handleSnap = (view: "top" | "front" | "side" | "isometric") => {
    cameraController.setCardinalView(view);
  };

  return (
    <div
      className="orientation-cube cyber-obsidian-panel hud-interactive"
      style={{
        position: "absolute",
        top: "70px",
        right: "18px",
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        zIndex: 25,
      }}
      title="Orientation Cube: Snap camera to cardinal viewplanes"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", fontWeight: 800, color: "var(--accent-azure)", letterSpacing: "0.05em" }}>
        <Compass size={12} />
        <span>ORIENTATION</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", width: "100%", marginTop: "2px" }}>
        <button
          className="hud-btn-subtle"
          onClick={() => handleSnap("top")}
          style={{ padding: "3px 6px", fontSize: "9px", fontWeight: 700 }}
          title="Top View (X-Z orbital plane)"
        >
          TOP
        </button>
        <button
          className="hud-btn-subtle"
          onClick={() => handleSnap("front")}
          style={{ padding: "3px 6px", fontSize: "9px", fontWeight: 700 }}
          title="Front View (X-Y elevation)"
        >
          FRONT
        </button>
        <button
          className="hud-btn-subtle"
          onClick={() => handleSnap("side")}
          style={{ padding: "3px 6px", fontSize: "9px", fontWeight: 700 }}
          title="Side View (Y-Z elevation)"
        >
          SIDE
        </button>
        <button
          className="hud-btn-subtle"
          onClick={() => handleSnap("isometric")}
          style={{ padding: "3px 6px", fontSize: "9px", fontWeight: 700 }}
          title="Isometric View (Default 45° perspective)"
        >
          ISO
        </button>
      </div>

      <div style={{ width: "100%", marginTop: "4px" }}>
        <InclinationCaliper
          currentElevationDeg={45}
          onSnapEcliptic={() => handleSnap("top")}
          onSnapPolar={() => handleSnap("front")}
        />
      </div>
    </div>
  );
};
