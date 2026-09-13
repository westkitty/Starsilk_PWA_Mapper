/**
 * Gravitational Lensing Distortion Mesh & Shader.
 * Generates an Einstein ring warping boundary around compact singularities.
 */

import * as THREE from 'three';

export interface GravitationalLensOptions {
  schwarzschildRadius: number;
  einsteinRingRadius?: number;
  glowColor?: number;
}

export function createGravitationalLensMesh(options: GravitationalLensOptions): THREE.Mesh {
  const rs = options.schwarzschildRadius;
  const re = options.einsteinRingRadius || rs * 2.6; // Typical photon sphere / Einstein ring ratio
  const glowHex = options.glowColor || 0x00d4ff;

  const geometry = new THREE.RingGeometry(rs * 1.05, re * 1.8, 64);

  const customMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uInnerRadius: { value: rs },
      uEinsteinRadius: { value: re },
      uGlowColor: { value: new THREE.Color(glowHex) },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uInnerRadius;
      uniform float uEinsteinRadius;
      uniform vec3 uGlowColor;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vPos;

      void main() {
        float r = length(vPos.xy);
        // Peak distortion brightness right at the Einstein ring radius
        float distToRing = abs(r - uEinsteinRadius);
        float ringIntensity = exp(-distToRing * distToRing / (uEinsteinRadius * 0.15));

        // Event horizon cutoff
        if (r < uInnerRadius * 1.02) {
          discard;
        }

        float alpha = clamp(ringIntensity * 0.85, 0.0, 0.9);
        gl_FragColor = vec4(uGlowColor * (1.0 + ringIntensity * 1.5), alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, customMaterial);
}
