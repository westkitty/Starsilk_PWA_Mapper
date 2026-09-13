/**
 * ASSET01: Procedural Planet Surface Texture Generator.
 * Procedural HTML5 2D canvas textures for rocky, desert, oceanic, ice, gas giant, and scorched worlds.
 */

import * as THREE from "three";
import { PlanetClassification } from "../simulation/types";
import { CraterScatterGenerator } from "./crater-scatter";

export function generatePlanetCanvasTexture(
  classification: PlanetClassification = "rocky",
  seed: number = 42,
  size: number = 256
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Base background
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, size, size);

  if (classification === "gas_giant") {
    // Banded horizontal Jupiter-like stripes
    const bands = 16;
    for (let i = 0; i < bands; i++) {
      const y = (i / bands) * size;
      const h = size / bands + 2;
      const lightness = 35 + ((Math.sin(i * 1.5 + seed) + 1) / 2) * 45;
      const hue = (seed * 37 + i * 12) % 60 + 15; // warm creams and ambers
      ctx.fillStyle = `hsl(${hue}, 60%, ${lightness}%)`;
      ctx.fillRect(0, y, size, h);

      // Add turbulence noise line
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, y + h * 0.4, size, h * 0.2);
    }
  } else if (classification === "oceanic") {
    // Deep blue oceans with swirling green/cyan continents
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(0, 0, size, size);
    for (let n = 0; n < 20; n++) {
      const x = ((seed * (n + 1) * 73) % size);
      const y = ((seed * (n + 1) * 31) % size);
      const r = 20 + ((seed * (n + 1)) % 45);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.7)");
      grad.addColorStop(0.7, "rgba(14, 116, 144, 0.4)");
      grad.addColorStop(1, "rgba(12, 74, 110, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (classification === "scorched") {
    // Charcoal crust with glowing red/orange lava fissures
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 2;
    for (let l = 0; l < 8; l++) {
      ctx.beginPath();
      ctx.moveTo((seed * 19 + l * 30) % size, 0);
      for (let s = 0; s < size; s += 20) {
        ctx.lineTo(((seed * 19 + l * 30 + Math.sin(s * 0.1) * 25) % size), s);
      }
      ctx.stroke();
    }
  } else {
    // Rocky / Desert / Ice cratered mottled surface
    const baseHue = classification === "ice" ? 200 : (classification === "desert" ? 35 : 215);
    const baseSat = classification === "ice" ? 30 : 50;
    ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, 40%)`;
    ctx.fillRect(0, 0, size, size);

    for (let c = 0; c < 20; c++) {
      const x = (seed * 47 * (c + 1)) % size;
      const y = (seed * 91 * (c + 1)) % size;
      const rad = 4 + (c % 12);
      ctx.fillStyle = c % 2 === 0 ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // Procedural impact craters with rims and central peaks (ASSET41)
    CraterScatterGenerator.stampCraters(ctx, size, size, 14);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
