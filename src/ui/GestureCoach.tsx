import React, { useState } from "react";
import { Hand, MousePointer, X } from "lucide-react";

export const GestureCoach: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.sessionStorage.getItem("ssp-gesture-coach-dismissed") === "true";
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("ssp-gesture-coach-dismissed", "true");
    }
  };

  return (
    <div
      className="gesture-coach cyber-obsidian-panel hud-interactive"
      style={{
        position: "absolute",
        bottom: "84px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "5px 12px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontSize: "10px",
        color: "var(--text-secondary)",
        zIndex: 25,
        borderRadius: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <MousePointer size={12} color="var(--accent-azure)" />
        <span><strong>1 Finger / Drag:</strong> Orbit</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <Hand size={12} color="var(--accent-amber)" />
        <span><strong>2 Fingers:</strong> Pan + Pinch Zoom</span>
      </div>
      <div>
        <span><strong>Double-Tap:</strong> Frame Body</span>
      </div>
      <button
        onClick={handleDismiss}
        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "1px 4px" }}
        title="Dismiss Gesture Coach"
      >
        <X size={12} />
      </button>
    </div>
  );
};
