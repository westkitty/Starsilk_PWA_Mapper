/**
 * ASSET05: Atmospheric Glow Shader.
 * Generates limb-darkened Rayleigh scattering halo around atmosphere-bearing planets.
 */

import * as THREE from "three";

export function createAtmosphericGlowMesh(radius: number, colorHex: number = 0x38bdf8): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius * 1.15, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(colorHex) },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
        gl_FragColor = vec4(glowColor, intensity * 0.7);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
