import React from "react";
import {
  MousePointer,
  Hand,
  PlusCircle,
  Compass,
  GitCommit,
  Waves,
  Focus,
  BookOpen,
  Eye,
  Ruler,
  Target,
  HelpCircle,
} from "lucide-react";
import { PointerToolMode } from "../interaction/pointer-manager";

interface ToolRailProps {
  activeTool: PointerToolMode;
  onSelectTool: (tool: PointerToolMode) => void;
  showFuture: boolean;
  onToggleShowFuture: () => void;
  showSensitivity: boolean;
  onToggleShowSensitivity: () => void;
  isFateLensActive?: boolean;
  onToggleFateLens?: () => void;
  hasSelectedBody?: boolean;
  onOpenCreateModal: () => void;
  onOpenCanonLab?: () => void;
  onResetCamera: () => void;
  onFrameSelected?: () => void;
  isPrecisionMode?: boolean;
  onTogglePrecisionMode?: () => void;
  isMeasurementOpen?: boolean;
  onToggleMeasurement?: () => void;
  onOpenHelp?: () => void;
}

export const ToolRail: React.FC<ToolRailProps> = ({
  activeTool,
  onSelectTool,
  showFuture,
  onToggleShowFuture,
  showSensitivity,
  onToggleShowSensitivity,
  isFateLensActive,
  onToggleFateLens,
  hasSelectedBody,
  onOpenCreateModal,
  onOpenCanonLab,
  onResetCamera,
  onFrameSelected,
  isPrecisionMode,
  onTogglePrecisionMode,
  isMeasurementOpen,
  onToggleMeasurement,
  onOpenHelp,
}) => {
  return (
    <>
      {/* Primary Manipulation Rail / Left Thumb-Arc */}
      <aside className="left-tool-rail tool-rail-arc-left hud-interactive cyber-obsidian-panel">
        {/* Select / Pointer */}
        <button
          className={`tool-button ${activeTool === "select" ? "active" : ""}`}
          onClick={() => onSelectTool("select")}
          title="Pointer / Selection (S Pen / Finger)"
          data-thumb-index="0"
        >
          <MousePointer size={18} />
          <span>SELECT</span>
        </button>

        {/* Grab & Throw */}
        <button
          className={`tool-button ${activeTool === "grab_throw" ? "active" : ""}`}
          onClick={() => onSelectTool("grab_throw")}
          title="Grab & Throw: Drag a body to adjust position or throw into orbit"
          data-thumb-index="1"
        >
          <Hand size={18} color="#f59e0b" />
          <span>GRAB</span>
        </button>

        {/* Create Body */}
        <button
          className="tool-button"
          onClick={onOpenCreateModal}
          title="Create Celestial Body (Star, Planet, Moon, Station)"
          data-thumb-index="2"
        >
          <PlusCircle size={18} color="#0cc6ff" />
          <span>CREATE</span>
        </button>

        {/* Orbit Loom */}
        <button
          className={`tool-button ${activeTool === "orbit_loom" ? "active" : ""}`}
          onClick={() => onSelectTool("orbit_loom")}
          title="Orbit Loom: Sketch an orbit with S Pen to fit conic ellipses"
          data-thumb-index="3"
        >
          <Compass size={18} color="#49e7ff" />
          <span>LOOM</span>
        </button>

        {/* Measurement Tool (#44) */}
        {onToggleMeasurement && (
          <button
            className={`tool-button ${isMeasurementOpen ? "active" : ""}`}
            onClick={onToggleMeasurement}
            title="Two-Point Analytical Measurement Tool"
            data-thumb-index="4"
          >
            <Ruler size={18} color={isMeasurementOpen ? "#0cc6ff" : "#38bdf8"} />
            <span>MEASURE</span>
          </button>
        )}
      </aside>

      {/* Analysis & Perception Rail / Right Thumb-Arc */}
      <aside className="right-tool-rail left-tool-rail tool-rail-arc-right hud-interactive cyber-obsidian-panel">
        {/* Frame / Center View (#33) */}
        <button
          className="tool-button"
          onClick={hasSelectedBody && onFrameSelected ? onFrameSelected : onResetCamera}
          title={hasSelectedBody ? "Frame Selected Body (F)" : "Center / Reset Camera View (0)"}
          data-thumb-index="0"
        >
          <Focus size={18} />
          <span>{hasSelectedBody ? "FRAME" : "CENTER"}</span>
        </button>

        {/* Precision Mode Toggle (#38) */}
        {onTogglePrecisionMode && (
          <button
            className={`tool-button ${isPrecisionMode ? "active" : ""}`}
            onClick={onTogglePrecisionMode}
            title="Precision Navigation Mode (0.25x sensitivity, P / Shift)"
            data-thumb-index="1"
          >
            <Target size={18} color={isPrecisionMode ? "#f59e0b" : undefined} />
            <span>PRECISION</span>
          </button>
        )}

        {/* Show Future */}
        <button
          className={`tool-button ${showFuture ? "active" : ""}`}
          onClick={onToggleShowFuture}
          title="Show Future: Predict trajectories and collisions"
          data-thumb-index="2"
        >
          <GitCommit size={18} />
          <span>FUTURE</span>
        </button>

        {/* Sensitivity Cloud */}
        <button
          className={`tool-button ${showSensitivity ? "active" : ""}`}
          onClick={onToggleShowSensitivity}
          title="Sensitivity Cloud: 30 perturbed futures showing dynamical sensitivity"
          data-thumb-index="3"
        >
          <Waves size={18} />
          <span>SENSITIVITY</span>
        </button>

        {/* Fate Lens */}
        {onToggleFateLens && (
          <button
            className={`tool-button ${isFateLensActive ? "active" : ""}`}
            onClick={onToggleFateLens}
            title={hasSelectedBody ? "Fate Lens: Temporal visualization (THEN → NOW → POSSIBLE)" : "Fate Lens: Select a body to perceive causality across time"}
            aria-label="Fate Lens"
            data-thumb-index="4"
          >
            <Eye size={18} color={isFateLensActive ? "#0cc6ff" : undefined} />
            <span>FATE</span>
          </button>
        )}

        {/* Canon Lab Button */}
        {onOpenCanonLab && (
          <button
            className="tool-button"
            onClick={onOpenCanonLab}
            title="Starsilk Canon Lab: Cosmological Mechanisms"
            data-thumb-index="5"
          >
            <BookOpen size={18} color="#d4a373" />
            <span>CANON</span>
          </button>
        )}

        {/* Controls & Gesture Help (#35) */}
        {onOpenHelp && (
          <button
            className="tool-button"
            onClick={onOpenHelp}
            title="Navigation & Controls Reference (?)"
            data-thumb-index="6"
          >
            <HelpCircle size={18} color="#94a3b8" />
            <span>HELP</span>
          </button>
        )}
      </aside>
    </>
  );
};
