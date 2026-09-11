/**
 * Procedural 3D Starfield with Continuous Camera Parallax.
 *
 * Key Architectural Enhancements:
 * - Deterministic seeded PRNG (Mulberry32) for 100% reproducible generation
 * - Natural large-scale stellar geography via smooth celestial density modulation (belt concentration + voids)
 * - Seamless overlapping layer boundaries eliminating discrete shell step transitions
 * - Continuous per-star parallax attribute (aParallax) evaluated in the vertex shader with uCameraPos
 * - Skewed astronomical magnitude power-law distribution (P(m) ~ m^3.2): faint dusting, mid stars, bright anchors
 * - Restrained astronomical stellar color temperature palette (neutral white, cool blue-white, warm cream, pale amber)
 * - Multi-component optical point-spread function (PSF) shader (nucleus, compact body, anti-aliased diffraction halo)
 * - Zero per-frame CPU star loops: camera position uniform update is O(1)
 * - 100% rigid celestial sphere coherence during pure camera rotation
 * - Zero raycast/picker or simulation engine contamination
 * - Complete Three.js lifecycle resource disposal
 */

import * as THREE from 'three';

export interface StarfieldLayerConfig {
  name: 'near' | 'mid' | 'deep';
  count: number;
  minRadius: number;
  maxRadius: number;
  minParallax: number;
  maxParallax: number;
  parallaxFactor: number; // Nominal layer parallax factor for backward compatibility
  minSize: number;
  maxSize: number;
  minAlpha: number;
  maxAlpha: number;
}

export interface StarfieldLayer {
  name: string;
  count: number;
  parallaxFactor: number;
  minRadius: number;
  maxRadius: number;
  group: THREE.Group;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
}

// Seeded Mulberry32 PRNG
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Restrained astronomical stellar color temperature palette
export const STELLAR_PALETTE = [
  // Class A/F: Pure & Neutral White (majority ~65%)
  new THREE.Color('#ffffff'),
  new THREE.Color('#f8f9fa'),
  new THREE.Color('#edf1f7'),
  // Class B: Subtle Cool Blue-White (~18%)
  new THREE.Color('#dce8ff'),
  new THREE.Color('#cbdcf7'),
  // Class G: Pale Yellow-White / Warm Cream (~12%)
  new THREE.Color('#fff4e0'),
  new THREE.Color('#ffeacc'),
  // Class K: Restrained Pale Amber (~5%)
  new THREE.Color('#ffd9be'),
];

// Galactic belt orientation normal (inclined ~62 degrees to ecliptic plane)
const BELT_NORMAL = new THREE.Vector3(0.35, 0.80, 0.48).normalize();

/**
 * Procedural density field for natural large-scale stellar geography.
 * Combines a subtle great-circle concentration (galactic plane) with gentle longitudinal harmonics (voids).
 */
export function evaluateStellarDensityField(
  dirX: number,
  dirY: number,
  dirZ: number,
  theta: number,
  sinPhi: number
): number {
  const dotBelt = dirX * BELT_NORMAL.x + dirY * BELT_NORMAL.y + dirZ * BELT_NORMAL.z;
  const beltDist = Math.abs(dotBelt);

  // Smooth Gaussian concentration along the celestial belt
  const beltFactor = 0.35 * Math.exp(-3.0 * beltDist * beltDist);

  // Gentle harmonic void variation
  const harmonic = 0.10 * Math.cos(2.0 * theta + 1.2) * sinPhi;

  // Total acceptance density in range [0.45, 1.00]
  return 0.55 + beltFactor + harmonic;
}

export class StarfieldRenderer {
  private rootGroup: THREE.Group;
  private layers: StarfieldLayer[] = [];
  private pixelRatio: number = 1.0;
  private isDisposed: boolean = false;

  private cameraPosUniform: { value: THREE.Vector3 } = { value: new THREE.Vector3(0, 0, 0) };
  private pixelRatioUniform: { value: number } = { value: 1.0 };

  public static readonly DEFAULT_SEED = 0x57415253; // 'STARS' in ASCII hex

  public static readonly LAYER_CONFIGS: StarfieldLayerConfig[] = [
    {
      name: 'deep',
      count: 3000,
      minRadius: 38000,
      maxRadius: 46000,
      minParallax: 0.008,
      maxParallax: 0.048,
      parallaxFactor: 0.02, // Nominal
      minSize: 1.0,
      maxSize: 2.2,
      minAlpha: 0.20,
      maxAlpha: 0.60,
    },
    {
      name: 'mid',
      count: 1200,
      minRadius: 33000,
      maxRadius: 41000,
      minParallax: 0.040,
      maxParallax: 0.220,
      parallaxFactor: 0.15, // Nominal
      minSize: 1.8,
      maxSize: 3.6,
      minAlpha: 0.40,
      maxAlpha: 0.80,
    },
    {
      name: 'near',
      count: 350,
      minRadius: 28000,
      maxRadius: 35000,
      minParallax: 0.180,
      maxParallax: 0.450,
      parallaxFactor: 0.40, // Nominal
      minSize: 2.5,
      maxSize: 5.5,
      minAlpha: 0.60,
      maxAlpha: 1.00,
    },
  ];

  constructor(pixelRatio: number = 1.0, seed: number = StarfieldRenderer.DEFAULT_SEED) {
    this.pixelRatio = pixelRatio;
    this.pixelRatioUniform.value = pixelRatio;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'starfield-root';

    const rand = createSeededRandom(seed);
    this.buildLayers(rand);
  }

  private buildLayers(rand: () => number): void {
    for (const config of StarfieldRenderer.LAYER_CONFIGS) {
      const geometry = new THREE.BufferGeometry();
      const count = config.count;

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const halos = new Float32Array(count);
      const parallaxes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        // Natural stellar geography via rejection sampling
        let dirX = 0, dirY = 1, dirZ = 0;
        let theta = 0, sinPhi = 0;
        while (true) {
          const u = rand();
          const v = rand();
          theta = 2.0 * Math.PI * u;
          const cosPhi = 2.0 * v - 1.0;
          sinPhi = Math.sqrt(Math.max(0, 1.0 - cosPhi * cosPhi));

          dirX = sinPhi * Math.cos(theta);
          dirY = cosPhi;
          dirZ = sinPhi * Math.sin(theta);

          const density = evaluateStellarDensityField(dirX, dirY, dirZ, theta, sinPhi);
          if (rand() <= density) {
            break;
          }
        }

        // Continuous radial distance within overlapping layer boundaries
        const rNorm = rand();
        const r = config.minRadius + rNorm * (config.maxRadius - config.minRadius);

        positions[i * 3] = r * dirX;
        positions[i * 3 + 1] = r * dirY;
        positions[i * 3 + 2] = r * dirZ;

        // Continuous per-star parallax factor tied smoothly to depth and jittered
        const depthFactor = (config.maxRadius - r) / (config.maxRadius - config.minRadius);
        const rawParallax = config.minParallax + depthFactor * (config.maxParallax - config.minParallax) + (rand() - 0.5) * 0.012;
        const parallax = Math.min(config.maxParallax, Math.max(config.minParallax, rawParallax));
        parallaxes[i] = parallax;

        // Skewed astronomical magnitude power-law distribution (P(m) ~ m^3.2)
        const t = rand();
        const magSkew = Math.pow(t, 3.2);

        // Size: faint stars 1.0-1.8px, mid 2.0-3.5px, anchors 3.8-5.5px, rare beacons up to 6.2px
        let size = config.minSize + magSkew * (config.maxSize - config.minSize) + rand() * 0.3;
        if (magSkew > 0.95 && config.name === 'near') {
          size = Math.min(6.2, size * 1.25);
        }
        sizes[i] = size;

        // Alpha: faint dusting to brilliant anchors
        const alpha = config.minAlpha + magSkew * (config.maxAlpha - config.minAlpha);
        alphas[i] = alpha;

        // Halo intensity: faint stars have compact Airy disk; luminous stars have soft expansive halo
        const halo = 0.10 + magSkew * 0.80 + rand() * 0.08;
        halos[i] = halo;

        // Restrained astronomical color temperature distribution
        const colorRoll = rand();
        let color: THREE.Color;
        if (colorRoll < 0.65) {
          color = STELLAR_PALETTE[Math.floor(rand() * 3)]; // Class A/F neutral white
        } else if (colorRoll < 0.83) {
          color = STELLAR_PALETTE[3 + Math.floor(rand() * 2)]; // Class B cool blue-white
        } else if (colorRoll < 0.95) {
          color = STELLAR_PALETTE[5 + Math.floor(rand() * 2)]; // Class G warm cream
        } else {
          color = STELLAR_PALETTE[7]; // Class K pale amber
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('aHalo', new THREE.BufferAttribute(halos, 1));
      geometry.setAttribute('aParallax', new THREE.BufferAttribute(parallaxes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uCameraPos: this.cameraPosUniform,
          uPixelRatio: this.pixelRatioUniform,
        },
        vertexShader: `
          attribute float aParallax;
          attribute float aSize;
          attribute float aAlpha;
          attribute float aHalo;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vHalo;
          uniform vec3 uCameraPos;
          uniform float uPixelRatio;

          void main() {
            vColor = color;
            vAlpha = aAlpha;
            vHalo = aHalo;

            // Continuous per-star parallax displacement:
            // Base positions are centered around origin.
            // Camera translation shifts the base star position by (1.0 - aParallax) * uCameraPos.
            // In camera space, this yields an apparent displacement of -aParallax * uCameraPos,
            // creating continuous differential angular parallax without CPU loops.
            vec3 worldPos = position + (1.0 - aParallax) * uCameraPos;
            vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
            gl_PointSize = aSize * uPixelRatio;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vHalo;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Multi-component optical point-spread function (PSF):
            // 1. Concentrated stellar nucleus (high-emission thermal core)
            float nucleus = exp(-14.0 * dist * dist);
            // 2. Compact stellar body (Airy disk)
            float body = 1.0 - smoothstep(0.12, 0.65, dist);
            // 3. Subtle diffraction halo (modulated by per-star aHalo attribute)
            float halo = (1.0 - smoothstep(0.25, 1.0, dist)) * vHalo;

            float intensity = nucleus * 0.45 + body * 0.35 + halo * 0.30;
            float alpha = clamp(intensity * vAlpha, 0.0, 1.0);

            // Core emission shifts toward pure white at the nucleus
            vec3 finalColor = mix(vColor, vec3(1.0), nucleus * 0.65);

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
        vertexColors: true,
      });

      const points = new THREE.Points(geometry, material);
      points.name = `starfield-points-${config.name}`;
      points.frustumCulled = false;
      // Explicitly mark non-raycastable
      points.raycast = () => {};

      const layerGroup = new THREE.Group();
      layerGroup.name = `starfield-layer-${config.name}`;
      layerGroup.add(points);

      this.rootGroup.add(layerGroup);

      this.layers.push({
        name: config.name,
        count: config.count,
        parallaxFactor: config.parallaxFactor,
        minRadius: config.minRadius,
        maxRadius: config.maxRadius,
        group: layerGroup,
        points,
        geometry,
        material,
      });
    }
  }

  /**
   * Update starfield with current camera position.
   *
   * Mathematical Laws:
   * - Pure Camera Rotation: Delta C = 0 -> uCameraPos unchanged.
   *   The celestial sphere rotates rigidly with the camera with zero angular drift.
   * - Camera Translation: GPU evaluates per-star displacement -aParallax_i * Delta C.
   *   Produces smooth continuous volumetric depth without per-frame CPU loops.
   */
  public update(camera: THREE.Camera): void {
    if (this.isDisposed) return;
    this.cameraPosUniform.value.copy(camera.position);
  }

  public setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.pixelRatioUniform.value = ratio;
  }

  public getPixelRatio(): number {
    return this.pixelRatio;
  }

  public getGroup(): THREE.Group {
    return this.rootGroup;
  }

  public getLayers(): StarfieldLayer[] {
    return this.layers;
  }

  public getTotalStarCount(): number {
    return this.layers.reduce((sum, l) => sum + l.count, 0);
  }

  public getCameraPosUniform(): THREE.Vector3 {
    return this.cameraPosUniform.value;
  }

  /**
   * Exact mathematical oracle for a star's world position under camera translation.
   * Mirrors the GPU vertex shader calculation: W_i = p_i + (1.0 - beta_i) * C.
   */
  public getStarWorldPosition(
    layerIndex: number,
    starIndex: number,
    cameraPosition: THREE.Vector3,
    target: THREE.Vector3 = new THREE.Vector3()
  ): THREE.Vector3 {
    const layer = this.layers[layerIndex];
    if (!layer) return target;
    const posAttr = layer.geometry.getAttribute('position');
    const parallaxAttr = layer.geometry.getAttribute('aParallax');
    const bx = posAttr.getX(starIndex);
    const by = posAttr.getY(starIndex);
    const bz = posAttr.getZ(starIndex);
    const beta = parallaxAttr ? parallaxAttr.getX(starIndex) : layer.parallaxFactor;

    target.set(
      bx + (1.0 - beta) * cameraPosition.x,
      by + (1.0 - beta) * cameraPosition.y,
      bz + (1.0 - beta) * cameraPosition.z
    );
    return target;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const layer of this.layers) {
      layer.geometry.dispose();
      layer.material.dispose();
      layer.group.remove(layer.points);
      this.rootGroup.remove(layer.group);
    }
    this.layers = [];
  }
}
