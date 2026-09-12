/**
 * Dense procedural 3D starfield with continuous camera parallax.
 *
 * The renderer intentionally stays cheap on the CPU: three Points draw calls,
 * deterministic generation, one camera-position uniform update per frame, and
 * no raycast/simulation participation. Visibility is tuned for dark PWA/mobile
 * displays without turning the field into a flat white noise texture.
 */

import * as THREE from 'three';

export interface StarfieldLayerConfig {
  name: 'near' | 'mid' | 'deep';
  count: number;
  minRadius: number;
  maxRadius: number;
  minParallax: number;
  maxParallax: number;
  parallaxFactor: number;
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

export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STELLAR_PALETTE = [
  new THREE.Color('#ffffff'),
  new THREE.Color('#f8f9fa'),
  new THREE.Color('#edf1f7'),
  new THREE.Color('#dce8ff'),
  new THREE.Color('#cbdcf7'),
  new THREE.Color('#fff4e0'),
  new THREE.Color('#ffeacc'),
  new THREE.Color('#ffd9be'),
];

const BELT_NORMAL = new THREE.Vector3(0.35, 0.80, 0.48).normalize();

export function evaluateStellarDensityField(
  dirX: number,
  dirY: number,
  dirZ: number,
  theta: number,
  sinPhi: number
): number {
  const dotBelt = dirX * BELT_NORMAL.x + dirY * BELT_NORMAL.y + dirZ * BELT_NORMAL.z;
  const beltDist = Math.abs(dotBelt);
  const beltFactor = 0.35 * Math.exp(-3.0 * beltDist * beltDist);
  const harmonic = 0.10 * Math.cos(2.0 * theta + 1.2) * sinPhi;
  return 0.55 + beltFactor + harmonic;
}

export class StarfieldRenderer {
  private rootGroup: THREE.Group;
  private layers: StarfieldLayer[] = [];
  private pixelRatio = 1.0;
  private isDisposed = false;

  private cameraPosUniform: { value: THREE.Vector3 } = { value: new THREE.Vector3(0, 0, 0) };
  private pixelRatioUniform: { value: number } = { value: 1.0 };
  private brightnessUniform: { value: number } = { value: 1.35 };

  public static readonly DEFAULT_SEED = 0x57415253;

  public static readonly LAYER_CONFIGS: StarfieldLayerConfig[] = [
    {
      name: 'deep',
      count: 7800,
      minRadius: 38000,
      maxRadius: 46000,
      minParallax: 0.010,
      maxParallax: 0.060,
      parallaxFactor: 0.025,
      minSize: 1.4,
      maxSize: 2.9,
      minAlpha: 0.42,
      maxAlpha: 0.82,
    },
    {
      name: 'mid',
      count: 3200,
      minRadius: 33000,
      maxRadius: 41000,
      minParallax: 0.055,
      maxParallax: 0.300,
      parallaxFactor: 0.18,
      minSize: 2.1,
      maxSize: 4.7,
      minAlpha: 0.55,
      maxAlpha: 0.96,
    },
    {
      name: 'near',
      count: 1000,
      minRadius: 28000,
      maxRadius: 35000,
      minParallax: 0.260,
      maxParallax: 0.650,
      parallaxFactor: 0.50,
      minSize: 3.0,
      maxSize: 6.8,
      minAlpha: 0.72,
      maxAlpha: 1.00,
    },
  ];

  constructor(pixelRatio = 1.0, seed: number = StarfieldRenderer.DEFAULT_SEED) {
    this.pixelRatio = pixelRatio;
    this.pixelRatioUniform.value = pixelRatio;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'starfield-root';
    this.rootGroup.renderOrder = -100;

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
        let dirX = 0;
        let dirY = 1;
        let dirZ = 0;
        let theta = 0;
        let sinPhi = 0;

        while (true) {
          const u = rand();
          const v = rand();
          theta = 2.0 * Math.PI * u;
          const cosPhi = 2.0 * v - 1.0;
          sinPhi = Math.sqrt(Math.max(0, 1.0 - cosPhi * cosPhi));
          dirX = sinPhi * Math.cos(theta);
          dirY = cosPhi;
          dirZ = sinPhi * Math.sin(theta);

          if (rand() <= evaluateStellarDensityField(dirX, dirY, dirZ, theta, sinPhi)) break;
        }

        const rNorm = rand();
        const r = config.minRadius + rNorm * (config.maxRadius - config.minRadius);
        positions[i * 3] = r * dirX;
        positions[i * 3 + 1] = r * dirY;
        positions[i * 3 + 2] = r * dirZ;

        const depthFactor = (config.maxRadius - r) / (config.maxRadius - config.minRadius);
        const jitterRange = config.name === 'near' ? 0.020 : 0.012;
        const rawParallax =
          config.minParallax +
          depthFactor * (config.maxParallax - config.minParallax) +
          (rand() - 0.5) * jitterRange;
        parallaxes[i] = Math.min(config.maxParallax, Math.max(config.minParallax, rawParallax));

        const magSkew = Math.pow(rand(), 3.0);
        let size = config.minSize + magSkew * (config.maxSize - config.minSize) + rand() * 0.28;
        if (magSkew > 0.955 && config.name === 'near') size = Math.min(7.4, size * 1.18);
        sizes[i] = size;

        alphas[i] = config.minAlpha + magSkew * (config.maxAlpha - config.minAlpha);
        halos[i] = Math.min(1.0, 0.18 + magSkew * 0.76 + rand() * 0.10);

        const colorRoll = rand();
        let color: THREE.Color;
        if (colorRoll < 0.65) {
          color = STELLAR_PALETTE[Math.floor(rand() * 3)];
        } else if (colorRoll < 0.83) {
          color = STELLAR_PALETTE[3 + Math.floor(rand() * 2)];
        } else if (colorRoll < 0.95) {
          color = STELLAR_PALETTE[5 + Math.floor(rand() * 2)];
        } else {
          color = STELLAR_PALETTE[7];
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
          uBrightness: this.brightnessUniform,
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
          uniform float uBrightness;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            float nucleus = exp(-16.0 * dist * dist);
            float body = 1.0 - smoothstep(0.10, 0.68, dist);
            float halo = (1.0 - smoothstep(0.20, 1.0, dist)) * vHalo;

            float intensity = nucleus * 0.78 + body * 0.58 + halo * 0.46;
            float alpha = clamp(intensity * (0.58 + vAlpha * 0.88), 0.0, 1.0);
            vec3 finalColor = mix(vColor, vec3(1.0), nucleus * 0.72) * uBrightness;

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });

      const points = new THREE.Points(geometry, material);
      points.name = `starfield-points-${config.name}`;
      points.frustumCulled = false;
      points.renderOrder = -100;
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
    return this.layers.reduce((sum, layer) => sum + layer.count, 0);
  }

  public getCameraPosUniform(): THREE.Vector3 {
    return this.cameraPosUniform.value;
  }

  public getBrightness(): number {
    return this.brightnessUniform.value;
  }

  public getStarWorldPosition(
    layerIndex: number,
    starIndex: number,
    cameraPosition: THREE.Vector3,
    target: THREE.Vector3 = new THREE.Vector3()
  ): THREE.Vector3 {
    const layer = this.layers[layerIndex];
    if (!layer) throw new RangeError(`Unknown starfield layer index ${layerIndex}`);
    if (starIndex < 0 || starIndex >= layer.count) throw new RangeError(`Unknown star index ${starIndex}`);

    const positions = layer.geometry.getAttribute('position').array as Float32Array;
    const parallaxes = layer.geometry.getAttribute('aParallax').array as Float32Array;
    const i3 = starIndex * 3;
    const beta = parallaxes[starIndex];

    target.set(
      positions[i3] + (1.0 - beta) * cameraPosition.x,
      positions[i3 + 1] + (1.0 - beta) * cameraPosition.y,
      positions[i3 + 2] + (1.0 - beta) * cameraPosition.z
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
    this.layers.length = 0;
    this.rootGroup.clear();
  }
}
