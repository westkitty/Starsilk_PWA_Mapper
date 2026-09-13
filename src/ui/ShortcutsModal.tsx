/**
 * UI02: Keyboard Shortcuts Reference Modal.
 */

import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Space", desc: "Pause / Resume simulation" },
    { key: "1 / 2 / 3 / 4", desc: "Set time scale (0.5x, 1x, 5x, 25x)" },
    { key: "LMB Drag", desc: "Pan camera view (threshold > 10px)" },
    { key: "MMB / Shift+LMB", desc: "Orbit 3D camera" },
    { key: "Wheel / Pinch", desc: "Cursor-anchored zoom" },
    { key: "O", desc: "Activate Orbit Loom tool" },
    { key: "G", desc: "Activate Grab & Throw tool" },
    { key: "S", desc: "Select tool" },
    { key: "F", desc: "Toggle Fate Lens multi-branch overlay" },
    { key: "N", desc: "Open System Navigator" },
    { key: "R", desc: "Reset camera to primary star" },
    { key: "Esc", desc: "Close open modal or clear selection" },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>Keyboard & Navigation Controls</h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#0f172a",
                borderRadius: "4px",
                border: "1px solid #1e293b",
                fontSize: "13px",
              }}
            >
              <kbd style={{ background: "#1e293b", padding: "2px 8px", borderRadius: "4px", color: "#38bdf8", fontFamily: "monospace" }}>
                {s.key}
              </kbd>
              <span style={{ color: "#cbd5e1" }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
