/**
 * Hill Sphere & Roche Limit Spatial Overlays.
 *
 * Invariants:
 * - Hill Sphere: Visualized for selected body using a restrained translucent field:
 *   low opacity (~0.07), subtle Fresnel rim, azure/blue-white hue.
 * - Roche Limit: Visualized around primary when selected satellite supports calculation:
 *   restrained crimson (#FF3344), hazard-style dashed ring.
 * - Warning state: Pulses stronger only when current distance crosses the computed limit.
 *   Does NOT falsely claim a violation merely because the overlay exists.
 * - Non-selectable; isolated from raycasting and physics loops.
 * - Clean Three.js lifecycle resource disposal.
 */

import * as THREE from 'three';
import { CelestialBody } from '../simulation/types';
import { ScaleTransform } from './scale-transform';
import { FloatingOrigin } from './floating-origin';

export class OrbitalBoundsOverlay {
  private group: THREE.Group;
  private scaleTransform: ScaleTransform;
  private floatingOrigin: FloatingOrigin;

  // Hill Sphere visual (Fresnel shell)
  private hillMesh: THREE.Mesh;
  private hillMaterial: THREE.ShaderMaterial;

  // Roche Limit visual (Dashed crimson hazard ring)
  private rocheRing: THREE.LineLoop;
  private rocheMaterial: THREE.LineDashedMaterial;

  // State tracking
  private isViolatingRoche: boolean = false;

  constructor(scaleTransform: ScaleTransform, floatingOrigin: FloatingOrigin) {
    this.scaleTransform = scaleTransform;
    this.floatingOrigin = floatingOrigin;

    this.group = new THREE.Group();
    this.group.name = 'OrbitalBoundsOverlayGroup';
    this.group.visible = false;

    // 1. Hill Sphere Mesh (Fresnel edge shell)
    const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
    this.hillMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color('#0cc6ff') },
        uOpacity: { value: 0.08 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = 1.0 - max(0.0, dot(vNormal, vViewDir));
          float edgeAlpha = pow(fresnel, 2.8) * 0.35 + 0.03;
          gl_FragColor = vec4(uColor, edgeAlpha * uOpacity * 4.0);
        }
      `,
    });

    this.hillMesh = new THREE.Mesh(sphereGeo, this.hillMaterial);
    this.hillMesh.name = 'hill-sphere';
    this.hillMesh.visible = false;
    this.group.add(this.hillMesh);

    // 2. Roche Limit Ring (Hazard dashed ring on equatorial plane)
    const rocheSegments = 64;
    const rocheGeo = new THREE.BufferGeometry();
    const rochePts = new Float32Array(rocheSegments * 3);
    for (let i = 0; i < rocheSegments; i++) {
      const angle = (i / rocheSegments) * Math.PI * 2;
      rochePts[i * 3] = Math.cos(angle);
      rochePts[i * 3 + 1] = 0;
      rochePts[i * 3 + 2] = Math.sin(angle);
    }
    rocheGeo.setAttribute('position', new THREE.BufferAttribute(rochePts, 3));

    this.rocheMaterial = new THREE.LineDashedMaterial({
      color: 0xff3344,
      dashSize: 3,
      gapSize: 2,
      linewidth: 1,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.rocheRing = new THREE.LineLoop(rocheGeo, this.rocheMaterial);
    this.rocheRing.name = 'roche-limit-ring';
    this.rocheRing.visible = false;
    this.group.add(this.rocheRing);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) {
      this.clear();
    }
  }

  /**
   * Update Hill sphere and Roche limit overlays for the selected body and its primary.
   */
  public update(
    selectedBody: CelestialBody | null,
    primaryBody: CelestialBody | null,
    hillRadiusKm: number | null,
    rocheLimitKm: number | null,
    _deltaSec: number = 0.016
  ): void {
    if (!selectedBody) {
      this.clear();
      return;
    }

    this.group.visible = true;

    // 1. UPDATE HILL SPHERE (around selected body)
    if (hillRadiusKm && hillRadiusKm > 0 && Number.isFinite(hillRadiusKm)) {
      const relPos = this.floatingOrigin.toRelative(selectedBody.position);
      const dispPos = this.scaleTransform.getDisplayPosition(relPos);
      const dispHillRadius = this.scaleTransform.getDisplayRadius(hillRadiusKm, 'planet');

      this.hillMesh.position.set(dispPos.x, dispPos.y, dispPos.z);
      this.hillMesh.scale.set(dispHillRadius, dispHillRadius, dispHillRadius);
      this.hillMesh.visible = true;
    } else {
      this.hillMesh.visible = false;
    }

    // 2. UPDATE ROCHE LIMIT (around primary body)
    if (primaryBody && rocheLimitKm && rocheLimitKm > 0 && Number.isFinite(rocheLimitKm)) {
      const primRel = this.floatingOrigin.toRelative(primaryBody.position);
      const primDisp = this.scaleTransform.getDisplayPosition(primRel);
      const dispRocheRadius = this.scaleTransform.getDisplayRadius(rocheLimitKm, 'planet');

      this.rocheRing.position.set(primDisp.x, primDisp.y, primDisp.z);
      this.rocheRing.scale.set(dispRocheRadius, dispRocheRadius, dispRocheRadius);
      this.rocheRing.computeLineDistances();
      this.rocheRing.visible = true;

      // Check for actual distance violation: r <= rocheLimitKm
      const dx = selectedBody.position.x - primaryBody.position.x;
      const dy = selectedBody.position.y - primaryBody.position.y;
      const dz = selectedBody.position.z - primaryBody.position.z;
      const currentDistKm = Math.hypot(dx, dy, dz);

      this.isViolatingRoche = currentDistKm <= rocheLimitKm;

      if (this.isViolatingRoche) {
        // Active warning: stronger pulse
        const pulse = 0.65 + 0.35 * Math.sin(performance.now() * 0.008);
        this.rocheMaterial.opacity = pulse;
        this.rocheMaterial.color.setHex(0xff1122);
      } else {
        // Restrained hazard boundary
        this.rocheMaterial.opacity = 0.55;
        this.rocheMaterial.color.setHex(0xff3344);
      }
    } else {
      this.rocheRing.visible = false;
      this.isViolatingRoche = false;
    }
  }

  public isRocheViolation(): boolean {
    return this.isViolatingRoche;
  }

  public clear(): void {
    this.hillMesh.visible = false;
    this.rocheRing.visible = false;
    this.group.visible = false;
    this.isViolatingRoche = false;
  }

  public dispose(): void {
    this.clear();
    this.hillMesh.geometry.dispose();
    this.hillMaterial.dispose();
    this.rocheRing.geometry.dispose();
    this.rocheMaterial.dispose();
  }
}
