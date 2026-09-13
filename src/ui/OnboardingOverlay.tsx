/**
 * UI04: Onboarding & First-Time User Coachmark Overlay.
 */

import React, { useState } from "react";

interface Props {
  onComplete: () => void;
}

export const OnboardingOverlay: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Starsilk System Planner",
      text: "Tactile 3D stellar-architecture laboratory and cosmological instrument. Navigate with LMB drag (pan) and MMB/Shift+LMB (orbit).",
    },
    {
      title: "Tactile Orbit Loom",
      text: "Select any star or planet, activate the Orbit Loom tool, and sweep across space to draw new satellite orbits with live periapsis handles.",
    },
    {
      title: "Starsilk Canon Lab & Fate Lens",
      text: "Explore cosmological mechanisms including PULL STARSILK, Starbinding, and comparative Fate Lens forward trajectories.",
    },
  ];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(3, 5, 10, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
    }}>
      <div style={{
        background: "#0b1329",
        border: "1px solid #38bdf8",
        padding: "24px",
        borderRadius: "8px",
        maxWidth: "460px",
        width: "90%",
        boxShadow: "0 0 32px rgba(56, 189, 248, 0.2)",
      }}>
        <div style={{ fontSize: "11px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          Step {step + 1} of {steps.length}
        </div>
        <h3 style={{ margin: "0 0 12px 0", color: "#f8fafc" }}>{steps[step].title}</h3>
        <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", marginBottom: "20px" }}>{steps[step].text}</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn-secondary" onClick={onComplete}>Skip Tutorial</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                onComplete();
              }
            }}
          >
            {step < steps.length - 1 ? "Next →" : "Begin Planning"}
          </button>
        </div>
      </div>
    </div>
  );
};
