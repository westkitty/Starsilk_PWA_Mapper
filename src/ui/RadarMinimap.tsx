/**
 * UI07: Ecliptic 2D Radar Minimap.
 * Renders 2D top-down orthogonal overview of orbiting bodies.
 */

import React, { useRef, useEffect } from "react";
import { CelestialBody } from "../simulation/types";

interface Props {
  bodies: CelestialBody[];
  selectedBodyId: string | null;
  onSelectBody: (id: string) => void;
}

export const RadarMinimap: React.FC<Props> = ({ bodies, selectedBodyId, onSelectBody }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Radar background
    ctx.fillStyle = "rgba(11, 19, 41, 0.75)";
    ctx.fillRect(0, 0, size, size);

    // Concentric range rings
    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    ctx.lineWidth = 1;
    const center = size / 2;
    [center * 0.3, center * 0.6, center * 0.9].forEach((r) => {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Find bounding radius in km
    let maxDist = 1;
    bodies.forEach((b) => {
      const d = Math.hypot(b.position.x, b.position.z);
      if (d > maxDist) maxDist = d;
    });

    // Plot bodies
    bodies.forEach((b) => {
      const px = center + (b.position.x / maxDist) * (center * 0.85);
      const py = center + (b.position.z / maxDist) * (center * 0.85);

      const isSelected = b.id === selectedBodyId;
      ctx.fillStyle = isSelected ? "#38bdf8" : b.color || "#e2e8f0";
      ctx.beginPath();
      ctx.arc(px, py, b.type === "star" ? 4 : (isSelected ? 3.5 : 2), 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [bodies, selectedBodyId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = canvas.width;
    const center = size / 2;

    let maxDist = 1;
    bodies.forEach((b) => {
      const d = Math.hypot(b.position.x, b.position.z);
      if (d > maxDist) maxDist = d;
    });

    let nearest: CelestialBody | null = null;
    let minDist = 12; // 12px tap threshold

    bodies.forEach((b) => {
      const px = center + (b.position.x / maxDist) * (center * 0.85);
      const py = center + (b.position.z / maxDist) * (center * 0.85);
      const dist = Math.hypot(x - px, y - py);
      if (dist < minDist) {
        minDist = dist;
        nearest = b;
      }
    });

    if (nearest) {
      onSelectBody((nearest as CelestialBody).id);
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "72px",
      left: "72px",
      width: "120px",
      height: "120px",
      borderRadius: "6px",
      overflow: "hidden",
      border: "1px solid #334155",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      zIndex: 50,
      cursor: "crosshair",
    }}>
      <canvas ref={canvasRef} width={120} height={120} onClick={handleClick} style={{ display: "block" }} />
    </div>
  );
};
