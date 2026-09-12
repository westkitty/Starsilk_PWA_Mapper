import React from "react";
import { X, Keyboard, Hand, PenTool, MousePointer } from "lucide-react";

interface ControlsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsHelpModal: React.FC<ControlsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(3, 5, 10, 0.78)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="hud-interactive"
    >
      <div
        className="cyber-obsidian-panel"
        style={{
          width: "500px",
          maxWidth: "92vw",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 800, color: "var(--accent-azure)" }}>
            <Keyboard size={16} />
            <span>NAVIGATION & CONTROLS GUIDE</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px" }}>
          <div>
            <div style={{ fontWeight: 800, color: "var(--accent-azure)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Hand size={14} /> Tablet & Touch Gestures
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              <li><strong>1 Finger Drag:</strong> Orbit camera around the active target.</li>
              <li><strong>2 Finger Drag + Pinch:</strong> Pan and focal zoom together, anchored to the gesture midpoint.</li>
              <li><strong>Double-Tap Body:</strong> Focus and smoothly frame body.</li>
              <li><strong>Double-Tap Empty Space:</strong> Reset system view.</li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "var(--accent-amber)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <PenTool size={14} /> S Pen & Stylus
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              <li><strong>Hover:</strong> Non-mutating telemetry calipers.</li>
              <li><strong>Plain Drag:</strong> Pan when no construction/manipulation tool owns the pen.</li>
              <li><strong>Barrel + Drag:</strong> Orbit camera where the browser exposes the S Pen barrel as the secondary button.</li>
              <li><strong>Orbit Loom / Grab & Throw:</strong> Tool actions retain pen priority; palm rejection remains active.</li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <MousePointer size={14} /> Desktop Mouse & Keyboard
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "128px 1fr", gap: "4px 8px", color: "var(--text-secondary)", marginTop: "4px" }}>
              <code>Left Drag</code><span>Pan after the click/drag threshold (Parable hand-feel grammar)</span>
              <code>Middle Drag</code><span>Orbit camera</span>
              <code>Shift/Alt + Left</code><span>Orbit fallback</span>
              <code>Wheel / Pinch</code><span>Focal zoom anchored to cursor position</span>
              <code>F</code><span>Frame selected body</span>
              <code>0</code><span>Reset view to system center</span>
              <code>+ / -</code><span>Zoom in / Zoom out</span>
              <code>Arrow Keys</code><span>Controlled camera orbit</span>
              <code>Space</code><span>Play / Pause simulation</span>
              <code>P / Shift</code><span>Toggle precision navigation mode (0.25x)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
