/**
 * Celestial Shaders and Graphic Visual Materials.
 * 
 * Implements:
 * - Signature Starsilk Azure Barcode Ribbon Shader: multi-frequency machine-code packet structure
 * - Luminous Star Shader with convective granulation and optional Starsilk bleed
 * - Stellar Corona & Magnetic Prominences: bounded outer atmosphere with chromosphere & loops
 * - Event-Horizon Black Hole Shader: absolute black void with multi-layer photon ring & local lensing
 * - Accretion Disk Shader: warped relativistic presentation with Doppler brightness asymmetry
 * - Gas Giant Shader: differential latitudinal cloud bands, turbulent shear, and seed-based storm vortex
 * - Drakken Blood Ring Material: vitrified crimson atrocity glass with faceted cracks & razor highlights
 * - Analytic Ring Umbra & Penumbra: dynamic parent shadow cylinder projection
 * - Graphic celestial planetary shaders with cel-shaded terminators and atmospheric rims
 */

import * as THREE from 'three';

/**
 * Star Shader Material.
 * Procedural convection cells, limb darkening, and Starsilk core indexing when active.
 */
export function createStarMaterial(color: string = '#ffcc44', starsilkBleed: number = 0): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(color);
  const azureColor = new THREE.Color('#0cc6ff');

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uAzureColor: { value: azureColor },
      uStarsilkBleed: { value: starsilkBleed },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uAzureColor;
      uniform float uStarsilkBleed;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      // Simple 3D noise approximation
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      void main() {
        // Convection turbulence
        float n1 = noise(vPosition * 0.08 + vec3(uTime * 0.2));
        float n2 = noise(vPosition * 0.16 - vec3(uTime * 0.3));
        float granulation = n1 * 0.7 + n2 * 0.3;

        // Limb darkening
        float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
        fresnel = clamp(fresnel, 0.0, 1.0);
        float limb = pow(fresnel, 0.6);

        vec3 starColor = mix(uBaseColor * 0.6, uBaseColor * 1.5, granulation) * limb;

        // Starsilk Extraction / Bleed overlay: ordered barcode filaments inside core
        if (uStarsilkBleed > 0.0) {
          float barcode = step(0.65, sin(vPosition.y * 1.2 + uTime * 3.0) * sin(vPosition.x * 0.8));
          vec3 bleedColor = mix(uAzureColor, vec3(1.0, 1.0, 1.0), barcode * 0.5);
          starColor = mix(starColor, bleedColor * 2.0, uStarsilkBleed * (1.0 - limb * 0.5));
        }

        gl_FragColor = vec4(starColor, 1.0);
      }
    `,
  });
}

/**
 * Stellar Corona & Magnetic Prominences Shader.
 * Bounded outer atmosphere with chromosphere, looping magnetic prominences, and outer corona.
 * Warm/white palette; azure appears ONLY when starsilkBleed > 0.
 */
export function createCoronaMaterial(color: string = '#ffcc44', starsilkBleed: number = 0): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(color);
  const azureColor = new THREE.Color('#0cc6ff');

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uAzureColor: { value: azureColor },
      uStarsilkBleed: { value: starsilkBleed },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uAzureColor;
      uniform float uStarsilkBleed;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        // Fresnel rim along grazing edge of outer shell
        float viewDot = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float rim = pow(1.0 - viewDot, 2.2);

        // Sparse looping magnetic prominence math
        float angle = atan(vPosition.y, vPosition.x);
        float radius = length(vPosition.xy);
        float loop1 = sin(angle * 5.0 + uTime * 0.4) * cos(angle * 3.0 - uTime * 0.2);
        float prominenceMask = smoothstep(0.4, 0.95, loop1) * exp(-abs(radius - 1.15) * 5.0);

        // Outer corona falloff
        float corona = rim * 0.65 + prominenceMask * 0.75;
        float alpha = clamp(corona * 0.6, 0.0, 0.85);

        // Color temperature: warm/white by default; azure bleed if starsilk is active
        vec3 coronaColor = mix(uBaseColor, vec3(1.0, 0.98, 0.92), rim * 0.5);
        if (uStarsilkBleed > 0.0) {
          coronaColor = mix(coronaColor, uAzureColor, uStarsilkBleed * 0.85);
        }

        gl_FragColor = vec4(coronaColor * 1.4, alpha);
      }
    `,
  });
}

/**
 * Event-Horizon Black Hole Material.
 * Absolute void center with multi-layer photon ring and grazing-angle gravitational lensing distortion.
 */
export function createBlackHoleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float grazing = 1.0 - abs(dot(vNormal, vViewDir));

        // Multi-component photon ring: concentrated primary ring + delicate secondary caustic
        float photonRingPrimary = smoothstep(0.94, 0.985, grazing) * (1.0 - smoothstep(0.985, 0.998, grazing));
        float photonRingSecondary = smoothstep(0.88, 0.93, grazing) * 0.35;
        float photonTotal = photonRingPrimary * 2.2 + photonRingSecondary;

        // Gravitational lensing rim color (high-energy blue-shifted vacuum edge)
        vec3 rimColor = vec3(0.12, 0.55, 1.0) * photonTotal;

        // Pure void interior silhouette
        gl_FragColor = vec4(rimColor, photonTotal > 0.02 ? 1.0 : 1.0);
      }
    `,
  });
}

/**
 * Warped Black Hole Accretion Disk Material.
 * Visual presentation with Doppler asymmetry (azure-white approaching, dim warm crimson receding).
 * Authored visual opt-in only.
 */
export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vLocalPos;

      void main() {
        // Radius normalized across ring width
        float r = vUv.x;
        float angle = atan(vLocalPos.y, vLocalPos.x);

        // Radial density with inner ISCO cutoff and outer fade
        float isco = smoothstep(0.0, 0.12, r);
        float outerFade = 1.0 - smoothstep(0.80, 1.0, r);
        float diskBand = sin(r * 90.0 - uTime * 8.0) * 0.15 + 0.85;

        // Relativistic Doppler beaming / asymmetry along azimuthal direction:
        // Approaching side (cos > 0) is blue-shifted & brighter
        // Receding side (cos < 0) is red-shifted & dimmer
        float dopplerFactor = cos(angle + 0.4);
        float beamIntensity = 1.0 + dopplerFactor * 0.75;

        vec3 blueShiftColor = vec3(0.25, 0.82, 1.0); // Azure-white
        vec3 redShiftColor = vec3(0.55, 0.08, 0.12);  // Dim crimson

        vec3 diskColor = mix(redShiftColor, blueShiftColor, dopplerFactor * 0.5 + 0.5);
        diskColor *= beamIntensity;

        float alpha = isco * outerFade * diskBand * 0.85;
        gl_FragColor = vec4(diskColor, alpha);
      }
    `,
  });
}

/**
 * Gas-Giant-Specific Atmospheric Shader.
 * Differential latitudinal cloud bands, turbulent transitions, and deterministic storm vortex.
 */
export function createGasGiantMaterial(
  colorHex: string,
  atmosphereColorHex?: string,
  seed: number = 42
): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(colorHex);
  const atmoColor = new THREE.Color(atmosphereColorHex || '#49e7ff');

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uAtmoColor: { value: atmoColor },
      uSeed: { value: (seed % 1000) * 0.137 },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uAtmoColor;
      uniform float uSeed;
      uniform vec3 uLightDir;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewDir;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        // Latitudinal band coordinate (-1.0 at south pole to +1.0 at north pole)
        float lat = vPosition.y;

        // Differential drift: alternating latitude bands drift east/west at different speeds
        float bandIndex = floor((lat + 1.0) * 6.0);
        float driftDir = mod(bandIndex, 2.0) == 0.0 ? 1.0 : -1.0;
        float driftTime = uTime * (0.04 + mod(bandIndex * 0.015, 0.05)) * driftDir;

        // Turbulent shear between bands
        float shear = sin((vPosition.x + driftTime) * 8.0 + uSeed) * 0.08;
        float effectiveLat = lat + shear;

        // Multi-frequency latitudinal cloud bands
        float bandPattern = sin(effectiveLat * 24.0 + uSeed * 3.0) * 0.45
                          + sin(effectiveLat * 48.0 - uSeed) * 0.25
                          + 0.30;

        // Palette modulation across bands
        vec3 lightBand = uBaseColor * 1.35;
        vec3 darkBand = uBaseColor * 0.55;
        vec3 surfaceColor = mix(darkBand, lightBand, clamp(bandPattern, 0.0, 1.0));

        // Long-lived storm vortex (Great-Red-Spot analog at southern mid-latitudes)
        vec2 stormCenter = vec2(cos(uSeed) * 0.7, -0.38);
        float stormDist = length(vPosition.xy - stormCenter);
        if (stormDist < 0.28) {
          float stormSpiral = sin(stormDist * 35.0 - uTime * 1.2);
          vec3 stormEyeColor = mix(vec3(0.85, 0.22, 0.15), vec3(1.0, 0.65, 0.4), stormSpiral * 0.5 + 0.5);
          float stormMask = smoothstep(0.28, 0.12, stormDist);
          surfaceColor = mix(surfaceColor, stormEyeColor, stormMask * 0.85);
        }

        // Lighting with cel-shaded terminator
        float NdotL = dot(vNormal, uLightDir);
        float celLight = 0.06;
        if (NdotL > 0.25) celLight = 1.0;
        else if (NdotL > 0.0) celLight = 0.68;
        else if (NdotL > -0.15) celLight = 0.28;

        vec3 lit = surfaceColor * celLight;

        // Atmospheric limb glow
        float fresnel = 1.0 - max(0.0, dot(vNormal, vViewDir));
        float atmoRim = pow(fresnel, 2.4) * max(0.1, NdotL + 0.35);
        lit = mix(lit, uAtmoColor, atmoRim * 0.75);

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
}

/**
 * Standard Planetary Ring Material with Analytic Umbra & Penumbra.
 */
export function createOrdinaryRingMaterial(color: string = '#c0b49c', parentRadius: number = 1.0): THREE.ShaderMaterial {
  const ringColor = new THREE.Color(color);
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uColor: { value: ringColor },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uParentRadius: { value: parentRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uLightDir;
      uniform float uParentRadius;
      varying vec2 vUv;
      varying vec3 vLocalPos;

      void main() {
        float r = vUv.x;

        // Cassini division gap around r = 0.65 to 0.70
        float gap = 1.0 - smoothstep(0.64, 0.66, r) * (1.0 - smoothstep(0.69, 0.71, r));
        float ringlets = sin(r * 180.0) * 0.15 + 0.85;
        float edgeFade = smoothstep(0.0, 0.05, r) * (1.0 - smoothstep(0.95, 1.0, r));

        // Analytic Ring Umbra & Penumbra:
        // In local group coordinates, ring is in X-Z plane (since rotation.x = PI/2)
        // Light direction projected onto ring plane
        float s = dot(vLocalPos, uLightDir);
        float shadowFactor = 1.0;

        if (s < 0.0) {
          // Behind parent relative to light source: calculate distance from shadow cylinder axis
          vec3 axisProj = s * uLightDir;
          float distToAxis = length(vLocalPos - axisProj);

          float umbraR = uParentRadius * 0.95;
          float penumbraR = uParentRadius * 1.08;
          shadowFactor = smoothstep(umbraR, penumbraR, distToAxis);
        }

        float finalShadow = mix(0.06, 1.0, shadowFactor);
        float alpha = gap * ringlets * edgeFade * 0.75;
        gl_FragColor = vec4(uColor * ringlets * finalShadow, alpha);
      }
    `,
  });
}

/**
 * Drakken Blood Ring Material.
 * Coherent vitrified crimson atrocity structure with faceted crystalline fractures,
 * razor-glass specular highlights, and analytic shadow response.
 */
export function createBloodRingMaterial(parentRadius: number = 1.0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uParentRadius: { value: parentRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uLightDir;
      uniform float uParentRadius;
      varying vec2 vUv;
      varying vec3 vLocalPos;

      // Voronoi/cellular approximation for faceted crystalline fracture
      float cellular(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float minDist = 1.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = fract(sin(vec2(dot(i + neighbor, vec2(127.1, 311.7)), dot(i + neighbor, vec2(269.5, 183.3)))) * 43758.5453);
            vec2 diff = neighbor + point - f;
            minDist = min(minDist, length(diff));
          }
        }
        return minDist;
      }

      void main() {
        float r = vUv.x;
        float angle = atan(vLocalPos.y, vLocalPos.x);

        // Faceted fracture pattern
        float facet = cellular(vec2(r * 32.0, angle * 18.0));
        float cracks = smoothstep(0.08, 0.14, facet);

        // Razor-glass specular highlights: sharp anisotropic glints
        float glint = pow(1.0 - abs(sin(angle * 24.0 + r * 16.0)), 12.0) * 0.85;

        // Palette: deep obsidian-crimson absorption + vitrified red veins
        vec3 deepObsidian = vec3(0.08, 0.0, 0.02);
        vec3 vitrifiedCrimson = vec3(0.48, 0.0, 0.06);
        vec3 razorGlint = vec3(1.0, 0.25, 0.35);

        vec3 ringColor = mix(deepObsidian, vitrifiedCrimson, cracks);
        ringColor += razorGlint * glint;

        // Analytic Umbra / Penumbra
        float s = dot(vLocalPos, uLightDir);
        float shadowFactor = 1.0;
        if (s < 0.0) {
          vec3 axisProj = s * uLightDir;
          float distToAxis = length(vLocalPos - axisProj);
          shadowFactor = smoothstep(uParentRadius * 0.95, uParentRadius * 1.08, distToAxis);
        }
        float finalShadow = mix(0.05, 1.0, shadowFactor);

        float edgeFade = smoothstep(0.0, 0.04, r) * (1.0 - smoothstep(0.96, 1.0, r));
        float alpha = edgeFade * 0.92;

        gl_FragColor = vec4(ringColor * finalShadow, alpha);
      }
    `,
  });
}

/**
 * Authentic Starsilk Azure Barcode Ribbon Shader.
 * Procedural multi-frequency machine-code packet structure carrying ordered information.
 * Features distinct packet widths, gaps, multi-lane channels, and axial data movement.
 */
export function createStarsilkRibbonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uLength: { value: 100.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        float u = vUv.x;
        float v = vUv.y;

        // Multi-lane data channels across v (4 parallel lanes)
        float laneIdx = floor(v * 4.0);
        float laneOffset = laneIdx * 0.23;

        // Axial data coordinate with differential lane velocity
        float streamPos = u * 180.0 - uTime * (3.5 + laneIdx * 0.8) + laneOffset;

        // High frequency machine-code barcode bits
        float bit1 = step(0.48, fract(streamPos * 0.5));
        float bit2 = step(0.35, fract(streamPos * 0.25 + 0.3));

        // Grouped packet framing: sync blocks every ~28 units followed by data packets
        float packetCycle = fract(streamPos / 28.0);
        float isSyncBlock = step(0.85, packetCycle);
        float isGap = step(packetCycle, 0.08); // Quiet parity gap

        // Composite barcode stripe
        float isBarcode = (bit1 * 0.7 + bit2 * 0.3) * (1.0 - isGap);
        if (isSyncBlock > 0.5) isBarcode = 1.0; // Dense solid sync delimiter

        // Edge luminous azure glow across v
        float edgeDist = abs(v - 0.5) * 2.0; // 0 in center, 1 at edges
        float edgeGlow = pow(edgeDist, 2.2);

        // Palette:
        // Deep ultramarine substrate: vec3(0.02, 0.08, 0.16)
        // Structured dark blue core: vec3(0.04, 0.16, 0.27)
        // Luminous azure data line: vec3(0.05, 0.78, 1.0)
        // Barcode cyan highlight: vec3(0.29, 0.91, 1.0)
        // Rare parity white accent: vec3(0.88, 0.97, 1.0)
        vec3 darkCore = vec3(0.04, 0.16, 0.27);
        vec3 azureEdge = vec3(0.05, 0.78, 1.0);
        vec3 cyanBit = vec3(0.29, 0.91, 1.0);
        vec3 parityWhite = vec3(0.88, 0.97, 1.0);

        vec3 color = mix(darkCore, azureEdge, edgeGlow * 0.85);

        if (isBarcode > 0.4) {
          color = mix(color, cyanBit, 0.75);
        }
        if (isSyncBlock > 0.5) {
          color = mix(color, parityWhite, 0.65);
        }

        // Alpha modulation
        float alpha = mix(0.45, 0.95, edgeGlow) * (0.60 + isBarcode * 0.40) * (1.0 - isGap * 0.7);

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

/**
 * High-Contrast Graphic Celestial Material for Planets and Moons.
 * Cel-shaded lighting with crisp terminator and atmospheric limb glow.
 */
export function createPlanetMaterial(
  colorHex: string,
  atmosphereColorHex?: string
): THREE.ShaderMaterial {
  const surfaceColor = new THREE.Color(colorHex);
  const atmoColor = new THREE.Color(atmosphereColorHex || '#49e7ff');
  const hasAtmo = Boolean(atmosphereColorHex);

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: surfaceColor },
      uAtmoColor: { value: atmoColor },
      uHasAtmo: { value: hasAtmo ? 1.0 : 0.0 },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) }, // Dynamic light direction toward primary
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(- (modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uAtmoColor;
      uniform float uHasAtmo;
      uniform vec3 uLightDir;

      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      void main() {
        // N dot L with crisp cel-shaded threshold
        float NdotL = dot(vNormal, uLightDir);
        // Stylized 3-step cel bands
        float celLight = 0.05; // Night side ambient
        if (NdotL > 0.3) {
          celLight = 1.0;
        } else if (NdotL > 0.0) {
          celLight = 0.65;
        } else if (NdotL > -0.15) {
          celLight = 0.25;
        }

        vec3 litSurface = uColor * celLight;

        // Atmospheric rim if present
        if (uHasAtmo > 0.5) {
          float fresnel = 1.0 - max(0.0, dot(vNormal, vViewDir));
          float atmoRim = pow(fresnel, 2.5) * max(0.1, NdotL + 0.3);
          litSurface = mix(litSurface, uAtmoColor, atmoRim * 0.85);
        }

        gl_FragColor = vec4(litSurface, 1.0);
      }
    `,
  });
}

