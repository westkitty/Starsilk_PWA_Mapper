/**
 * UI12: Camera Viewport Bookmarks & Alignment Presets.
 */

import React from "react";

interface Props {
  onSetCameraPreset: (preset: "top" | "side" | "inner" | "outer") => void;
}

export const CameraBookmarks: React.FC<Props> = ({ onSetCameraPreset }) => {
  return (
    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
      <button className="btn-secondary" style={{ fontSize: "10px", padding: "3px 6px" }} onClick={() => onSetCameraPreset("top")}>
        Top
      </button>
      <button className="btn-secondary" style={{ fontSize: "10px", padding: "3px 6px" }} onClick={() => onSetCameraPreset("side")}>
        Side
      </button>
      <button className="btn-secondary" style={{ fontSize: "10px", padding: "3px 6px" }} onClick={() => onSetCameraPreset("inner")}>
        Inner
      </button>
      <button className="btn-secondary" style={{ fontSize: "10px", padding: "3px 6px" }} onClick={() => onSetCameraPreset("outer")}>
        Outer
      </button>
    </div>
  );
};
