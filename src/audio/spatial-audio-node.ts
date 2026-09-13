/**
 * Positional 3D Web Audio Spatialization Node.
 * Binds celestial positions to Web Audio PannerNodes for true spatial audio immersion.
 */

import { Vector3 } from 'three';

export class SpatialAudioNode {
  private panner: PannerNode | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(audioCtx?: AudioContext) {
    if (audioCtx) {
      this.audioCtx = audioCtx;
      try {
        this.panner = audioCtx.createPanner();
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;
        this.panner.maxDistance = 10000;
        this.panner.rolloffFactor = 1;
      } catch (e) {
        console.warn('Spatial Audio not supported or failed to init', e);
      }
    }
  }

  public getPanner(): PannerNode | null {
    return this.panner;
  }

  public updatePosition(pos: Vector3): void {
    if (!this.panner || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    if (this.panner.positionX) {
      this.panner.positionX.setValueAtTime(pos.x, t);
      this.panner.positionY.setValueAtTime(pos.y, t);
      this.panner.positionZ.setValueAtTime(pos.z, t);
    } else {
      this.panner.setPosition(pos.x, pos.y, pos.z);
    }
  }

  public updateListener(cameraPos: Vector3, forward: Vector3, up: Vector3): void {
    if (!this.audioCtx) return;
    const listener = this.audioCtx.listener;
    const t = this.audioCtx.currentTime;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(cameraPos.x, t);
      listener.positionY.setValueAtTime(cameraPos.y, t);
      listener.positionZ.setValueAtTime(cameraPos.z, t);
      listener.forwardX.setValueAtTime(forward.x, t);
      listener.forwardY.setValueAtTime(forward.y, t);
      listener.forwardZ.setValueAtTime(forward.z, t);
      listener.upX.setValueAtTime(up.x, t);
      listener.upY.setValueAtTime(up.y, t);
      listener.upZ.setValueAtTime(up.z, t);
    } else {
      listener.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }
}
