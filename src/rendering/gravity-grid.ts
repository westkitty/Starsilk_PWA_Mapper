/**
 * Newtonian Gravitational Potential Grid Visualization.
 * 
 * Displays Newtonian gravitational potential wells and saddles across the system's
 * primary orbital plane without falsely claiming to simulate general relativity.
 */

import * as THREE from 'three';
import { CelestialBody } from '../simulation/types';
import { ScaleTransform } from './scale-transform';

export class GravityGridRenderer {
  private mesh: THREE.LineSegments;
  private geometry: THREE.BufferGeometry;
  private scaleTransform: ScaleTransform;

  private readonly gridSize = 1000.0; // In Three.js units
  private readonly divisions = 60;
  private initialPositions: Float32Array;

  constructor(scaleTransform: ScaleTransform) {
    this.scaleTransform = scaleTransform;

    const lineCount = (this.divisions + 1) * 2;
    const vertexCount = lineCount * (this.divisions + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);

    const step = this.gridSize / this.divisions;
    const half = this.gridSize / 2.0;

    let idx = 0;
    const baseColor = new THREE.Color('#0a2a44');

    // Horizontal lines along X
    for (let i = 0; i <= this.divisions; i++) {
      const z = -half + i * step;
      for (let j = 0; j < this.divisions; j++) {
        const x1 = -half + j * step;
        const x2 = -half + (j + 1) * step;

        positions[idx * 3] = x1;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;

        positions[idx * 3 + 3] = x2;
        positions[idx * 3 + 4] = 0;
        positions[idx * 3 + 5] = z;

        for (let k = 0; k < 2; k++) {
          colors[(idx + k) * 3] = baseColor.r;
          colors[(idx + k) * 3 + 1] = baseColor.g;
          colors[(idx + k) * 3 + 2] = baseColor.b;
        }

        idx += 2;
      }
    }

    // Vertical lines along Z
    for (let i = 0; i <= this.divisions; i++) {
      const x = -half + i * step;
      for (let j = 0; j < this.divisions; j++) {
        const z1 = -half + j * step;
        const z2 = -half + (j + 1) * step;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z1;

        positions[idx * 3 + 3] = x;
        positions[idx * 3 + 4] = 0;
        positions[idx * 3 + 5] = z2;

        for (let k = 0; k < 2; k++) {
          colors[(idx + k) * 3] = baseColor.r;
          colors[(idx + k) * 3 + 1] = baseColor.g;
          colors[(idx + k) * 3 + 2] = baseColor.b;
        }

        idx += 2;
      }
    }

    this.initialPositions = new Float32Array(positions);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.LineSegments(this.geometry, material);
  }

  // Semantic lock: Authoritative instrument metadata
  public readonly instrumentClassification = 'NEWTONIAN GRAVITATIONAL POTENTIAL';

  // Event-driven shock ripples (brief and non-continuous)
  private eventRipples: { x: number; z: number; elapsedSec: number; maxDurationSec: number; intensity: number }[] = [];

  public getMesh(): THREE.LineSegments {
    return this.mesh;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /**
   * Trigger a brief, event-driven shock ripple across the potential field (e.g. on collision or collapse).
   */
  public triggerEventRipple(displayX: number, displayZ: number, intensity: number = 1.0): void {
    this.eventRipples.push({
      x: displayX,
      z: displayZ,
      elapsedSec: 0,
      maxDurationSec: 1.6,
      intensity: Math.min(2.5, intensity),
    });
  }

  /**
   * Deform grid based on sum of Newtonian gravitational potential Phi = - sum(G * M / r).
   * Generates topographic contour isolines tightening around massive wells and revealing saddle structures.
   */
  public update(bodies: CelestialBody[], deltaSec: number = 0.016): void {
    if (!this.mesh.visible) return;

    // Update active event ripples
    for (let r = this.eventRipples.length - 1; r >= 0; r--) {
      this.eventRipples[r].elapsedSec += deltaSec;
      if (this.eventRipples[r].elapsedSec >= this.eventRipples[r].maxDurationSec) {
        this.eventRipples.splice(r, 1);
      }
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const nVertices = posArr.length / 3;
    const majorBodies = bodies.filter(b => b.massKg > 1e22); // Filter out tiny probes

    const darkField = new THREE.Color('#030710');
    const azureWell = new THREE.Color('#0cc6ff');
    const contourHighlight = new THREE.Color('#38bdf8');
    const extremeCrimson = new THREE.Color('#ff3344');

    // Precalculate display positions and potential factors for bodies
    const bodyProps = majorBodies.map(b => {
      const disp = this.scaleTransform.getDisplayPosition(b.position);
      // Normalized potential depth factor
      const depthFactor = Math.log10(b.massKg) * 0.85;
      return { x: disp.x, z: disp.z, factor: depthFactor };
    });

    for (let i = 0; i < nVertices; i++) {
      const origX = this.initialPositions[i * 3];
      const origZ = this.initialPositions[i * 3 + 2];

      let depth = 0;
      for (const bp of bodyProps) {
        const dx = origX - bp.x;
        const dz = origZ - bp.z;
        const distSq = dx * dx + dz * dz + 400.0; // Softening
        depth += (bp.factor * 120.0) / Math.sqrt(distSq);
      }

      // Event ripple perturbation
      let rippleOffset = 0;
      for (const rip of this.eventRipples) {
        const rdx = origX - rip.x;
        const rdz = origZ - rip.z;
        const rDist = Math.hypot(rdx, rdz);
        const waveFront = rip.elapsedSec * 160.0;
        const distFromFront = Math.abs(rDist - waveFront);
        if (distFromFront < 40.0) {
          const envelope = (1.0 - distFromFront / 40.0) * (1.0 - rip.elapsedSec / rip.maxDurationSec);
          rippleOffset += Math.sin(rDist * 0.25 - rip.elapsedSec * 12.0) * envelope * rip.intensity * 3.5;
        }
      }

      // Clamp max well depth
      const yDep = -Math.min(48.0, depth) + rippleOffset;
      posArr[i * 3 + 1] = yDep;

      // Topographic isoline contour calculation:
      // Contour bands at intervals of 4.5 units of potential depth
      const absDepth = Math.abs(yDep);
      const contourInterval = 4.5;
      const modVal = absDepth % contourInterval;
      const isContourLine = modVal < 0.8; // Sharp isoline band

      // Base depth interpolation (darkField -> azureWell)
      const tDepth = Math.min(1.0, absDepth / 32.0);
      const baseR = darkField.r * (1 - tDepth) + azureWell.r * tDepth;
      const baseG = darkField.g * (1 - tDepth) + azureWell.g * tDepth;
      const baseB = darkField.b * (1 - tDepth) + azureWell.b * tDepth;

      let r = isContourLine ? Math.max(baseR, contourHighlight.r * 0.9) : baseR;
      let g = isContourLine ? Math.max(baseG, contourHighlight.g * 0.9) : baseG;
      let b = isContourLine ? Math.max(baseB, contourHighlight.b * 0.9) : baseB;

      // Extreme deep well warning (crimson tint in extreme core regions > 40)
      if (absDepth > 40.0) {
        const tWarn = Math.min(1.0, (absDepth - 40.0) / 8.0);
        r = r * (1 - tWarn) + extremeCrimson.r * tWarn;
        g = g * (1 - tWarn) + extremeCrimson.g * tWarn;
        b = b * (1 - tWarn) + extremeCrimson.b * tWarn;
      }

      colArr[i * 3] = r;
      colArr[i * 3 + 1] = g;
      colArr[i * 3 + 2] = b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}
