/**
 * ASSET03: Dynamic Accretion Disk Shader.
 * Renders relativistic Doppler beamed glowing plasma swirls around black holes.
 */

import * as THREE from "three";

export function createAccretionDiskMesh(innerRadius: number = 8, outerRadius: number = 24): THREE.Mesh {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInnerRadius: { value: innerRadius },
      uOuterRadius: { value: outerRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      varying vec3 vPosition;

      void main() {
        float dist = length(vPosition.xz);
        float normDist = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);
        if (normDist < 0.0 || normDist > 1.0) discard;

        float angle = atan(vPosition.z, vPosition.x);
        // Doppler beaming: approaching side is brighter
        float doppler = 0.5 + 0.5 * sin(angle + uTime * 2.0);
        float swirl = sin(angle * 6.0 - uTime * 4.0 + normDist * 8.0) * 0.5 + 0.5;

        vec3 innerColor = vec3(0.3, 0.7, 1.0); // Azure filament hot core
        vec3 outerColor = vec3(0.9, 0.3, 0.1); // Fiery accretion edge
        vec3 color = mix(innerColor, outerColor, normDist) * (0.8 + 0.4 * swirl) * (0.6 + 0.7 * doppler);

        float alpha = sin(normDist * 3.14159) * 0.85;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
