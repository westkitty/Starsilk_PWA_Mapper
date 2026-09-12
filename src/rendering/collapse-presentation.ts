import * as THREE from 'three';

export interface CollapsePresentationConfig {
  targetPos: THREE.Vector3;
  initialRadius: number;
  onComplete?: () => void;
  reducedMotion?: boolean;
}

/**
 * PULL STARSILK presentation sequence (Phase B #15).
 * 2-3s presentation sequence:
 * 1. Compression: Inward contraction and stellar heating
 * 2. Implosion: Rapid collapse into singularity
 * 3. Singularity resolution & shock ring: Azure shockwave expansion
 * Respects prefers-reduced-motion with gentle instantaneous/abbreviated transition.
 */
export class CollapsePresentation {
  private group: THREE.Group;
  private shockRing: THREE.Mesh;
  private shockRingMat: THREE.ShaderMaterial;
  private flashMesh: THREE.Mesh;
  private flashMat: THREE.MeshBasicMaterial;
  private active = false;
  private progress = 0;
  private duration = 2.4; // 2.4s sequence
  private initialRadius = 10;
  private onComplete?: () => void;
  private reducedMotion = false;
  private targetBodyId: string | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'collapse-presentation';
    this.group.visible = false;

    // Expanding shockwave ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.2, 64);
    this.shockRingMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color('#38bdf8') }, // Azure shockwave
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float r = vUv.x;
          float edge = sin(r * 3.14159);
          float alpha = edge * (1.0 - uProgress) * 0.9;
          gl_FragColor = vec4(uColor * (1.0 + (1.0 - uProgress) * 1.5), alpha);
        }
      `,
    });
    this.shockRing = new THREE.Mesh(ringGeo, this.shockRingMat);
    this.shockRing.rotation.x = Math.PI / 2;
    this.group.add(this.shockRing);

    // Subtle center glow sphere
    const flashGeo = new THREE.SphereGeometry(1.0, 16, 16);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.group.add(this.flashMesh);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getTargetBodyId(): string | null {
    return this.targetBodyId;
  }

  public start(config: CollapsePresentationConfig, targetBodyId?: string): void {
    this.active = true;
    this.progress = 0;
    this.initialRadius = Math.max(1.0, config.initialRadius);
    this.onComplete = config.onComplete;
    this.targetBodyId = targetBodyId || null;
    this.group.position.copy(config.targetPos);
    this.group.visible = true;

    // Check prefers-reduced-motion
    this.reducedMotion = config.reducedMotion ?? (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
    );

    if (this.reducedMotion) {
      this.duration = 0.5; // Abbreviated transition
    } else {
      this.duration = 2.4;
    }
  }

  public update(deltaSec: number, targetMeshGroup?: THREE.Group | null): void {
    if (!this.active) return;

    this.progress += deltaSec / this.duration;
    const p = Math.min(1.0, this.progress);

    if (this.reducedMotion) {
      const fade = Math.sin(p * Math.PI);
      this.flashMat.opacity = fade * 0.35;
      this.shockRing.visible = false;
      if (targetMeshGroup) {
        const core = targetMeshGroup.getObjectByName('core');
        if (core) {
          const s = (1.0 - p) * 0.8 + 0.2;
          core.scale.set(s, s, s);
        }
      }
    } else {
      // 3-stage presentation:
      // Stage 1 (0.0 to 0.42): Compression
      // Stage 2 (0.42 to 0.62): Rapid implosion
      // Stage 3 (0.62 to 1.0): Singularity resolution & shock ring
      if (p < 0.42) {
        const stageP = p / 0.42;
        const scaleFactor = 1.0 - stageP * 0.45;
        if (targetMeshGroup) {
          const core = targetMeshGroup.getObjectByName('core');
          if (core) {
            core.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }
        }
        this.flashMat.opacity = stageP * 0.3;
        this.flashMesh.scale.setScalar(scaleFactor * 1.2);
        this.shockRing.visible = false;
      } else if (p < 0.62) {
        const stageP = (p - 0.42) / 0.20;
        const scaleFactor = (1.0 - stageP) * 0.55 + 0.05;
        if (targetMeshGroup) {
          const core = targetMeshGroup.getObjectByName('core');
          if (core) {
            core.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }
        }
        this.flashMat.opacity = (1.0 - stageP) * 0.85;
        this.shockRing.visible = false;
      } else {
        const stageP = (p - 0.62) / 0.38;
        this.shockRing.visible = true;
        const ringScale = this.initialRadius * (1.0 + stageP * 7.5);
        this.shockRing.scale.set(ringScale, ringScale, ringScale);
        this.shockRingMat.uniforms.uProgress.value = stageP;
        this.flashMat.opacity = (1.0 - stageP) * 0.2;
      }
    }

    if (this.progress >= 1.0) {
      this.active = false;
      this.group.visible = false;
      this.shockRing.visible = false;
      this.flashMat.opacity = 0;
      this.targetBodyId = null;
      if (this.onComplete) {
        const cb = this.onComplete;
        this.onComplete = undefined;
        cb();
      }
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public dispose(): void {
    this.shockRing.geometry.dispose();
    this.shockRingMat.dispose();
    this.flashMesh.geometry.dispose();
    this.flashMat.dispose();
  }
}
