/**
 * Planetary City Lights Night-Side Emissive Map Generator.
 * Synthesizes nocturnal technosphere cluster textures that appear only on the dark hemisphere of populated worlds.
 */

import * as THREE from 'three';

export function createCityLightsCanvas(width = 512, height = 256, numClusters = 40): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw bright golden city clusters
  for (let i = 0; i < numClusters; i++) {
    const cx = Math.random() * width;
    const cy = height * 0.2 + Math.random() * (height * 0.6); // Concentrated in temperate latitudes
    const radius = 5 + Math.random() * 20;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.9)'); // Warm yellow core
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.5)'); // Amber mid
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Secondary satellite town specks
    for (let j = 0; j < 8; j++) {
      const sx = cx + (Math.random() - 0.5) * radius * 2;
      const sy = cy + (Math.random() - 0.5) * radius * 1.5;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }

  return canvas;
}

export function createCityLightsTexture(): THREE.CanvasTexture {
  const canvas = createCityLightsCanvas(512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
