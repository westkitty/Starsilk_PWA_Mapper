/**
 * UI15: Accessibility Controls Toggle.
 */

import React from "react";

interface Props {
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
}

export const AccessibilityControls: React.FC<Props> = ({ isHighContrast, onToggleHighContrast }) => {
  return (
    <button
      className={isHighContrast ? "btn-primary" : "btn-secondary"}
      onClick={onToggleHighContrast}
      style={{ fontSize: "11px", padding: "4px 8px" }}
      title="Toggle High-Contrast Accessibility Mode"
    >
      A11Y {isHighContrast ? "ON" : "OFF"}
    </button>
  );
};
