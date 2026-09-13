/**
 * ASSET02: Procedural Ring Textures.
 * Generates high-resolution radial alpha maps for multi-banded rings and Drakken blood rings.
 */

import * as THREE from "three";

export function generateRingTexture(isBloodRing: boolean = false, size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const imgData = ctx.createImageData(size, 1);
  const data = imgData.data;

  for (let x = 0; x < size; x++) {
    const t = x / size;
    // Cassini division gap around t = 0.65 to 0.72
    const isGap = t >= 0.65 && t <= 0.72;
    const density = isGap ? 0.05 : Math.sin(t * Math.PI) * (0.5 + 0.5 * Math.sin(x * 0.8));

    const index = x * 4;
    if (isBloodRing) {
      // Crimson Drakken vitrified color
      data[index] = Math.round(180 + 75 * Math.sin(t * 10)); // R
      data[index + 1] = 20; // G
      data[index + 2] = 30; // B
      data[index + 3] = Math.round(density * 240); // Alpha
    } else {
      // Silvery-tan ice/dust particles
      data[index] = Math.round(210 + 30 * Math.sin(t * 5));
      data[index + 1] = Math.round(200 + 30 * Math.sin(t * 5));
      data[index + 2] = Math.round(185 + 30 * Math.sin(t * 5));
      data[index + 3] = Math.round(density * 220);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
