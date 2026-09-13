/**
 * UI14: Collision & Roche Breach Warning Banner.
 */

import React from "react";

interface Props {
  hasWarning: boolean;
  message: string;
  onPause: () => void;
}

export const CollisionWarningBanner: React.FC<Props> = ({ hasWarning, message, onPause }) => {
  if (!hasWarning) return null;

  return (
    <div style={{
      position: "fixed",
      top: "56px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#7f1d1d",
      border: "1px solid #ef4444",
      color: "#fee2e2",
      padding: "8px 16px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      zIndex: 500,
      fontSize: "12px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
    }}>
      <span>⚠️ {message}</span>
      <button
        onClick={onPause}
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          padding: "3px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "11px",
        }}
      >
        Pause & Intervene
      </button>
    </div>
  );
};
