/**
 * Procedural Surface Bump & Normal Map Synthesizer.
 * Generates high-relief normal maps for cratered rocky crusts, canyons, and continental shelf edges.
 */

import * as THREE from 'three';

export function createProceduralBumpCanvas(width = 512, height = 256, seed = 12345): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Simple pseudo-random hash generator for bump noise
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Multi-octave gradient height
      const n1 = hash(Math.floor(x / 8), Math.floor(y / 8));
      const n2 = hash(Math.floor(x / 16), Math.floor(y / 16)) * 0.5;
      const heightVal = Math.floor((n1 * 0.5 + n2) * 255);

      data[idx] = heightVal;     // R
      data[idx + 1] = heightVal; // G
      data[idx + 2] = heightVal; // B
      data[idx + 3] = 255;       // A
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function createProceduralBumpTexture(seed = 12345): THREE.CanvasTexture {
  const canvas = createProceduralBumpCanvas(512, 256, seed);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
