/**
 * UI08: Audio Settings Modal.
 */

import React from "react";
import { audioSynth } from "../audio/audio-synth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export const AudioSettingsModal: React.FC<Props> = ({ isOpen, onClose, audioEnabled, onToggleAudio }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>Audio Synthesizer Settings</h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "12px", background: "#0f172a", borderRadius: "6px" }}>
          <span>Master Sound Engine</span>
          <button className={audioEnabled ? "btn-primary" : "btn-secondary"} onClick={onToggleAudio}>
            {audioEnabled ? "ENABLED" : "MUTED"}
          </button>
        </div>

        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>Sound FX Audition Test:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button className="btn-secondary" onClick={() => audioSynth.playTick()}>Tick</button>
          <button className="btn-secondary" onClick={() => audioSynth.playOrbitLock()}>Orbit Lock</button>
          <button className="btn-secondary" onClick={() => audioSynth.playResonance()}>Resonance Bell</button>
          <button className="btn-secondary" onClick={() => audioSynth.playSlingshotWhoosh()}>Slingshot</button>
          <button className="btn-secondary" onClick={() => audioSynth.playImpactThud()}>Impact</button>
          <button className="btn-secondary" onClick={() => audioSynth.playSyzygyChime()}>Syzygy Chime</button>
        </div>
      </div>
    </div>
  );
};
