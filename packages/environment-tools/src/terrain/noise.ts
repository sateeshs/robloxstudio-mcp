/**
 * Multi-octave Perlin-like noise for terrain heightmap generation.
 * Uses a simple hash-based noise function that matches math.noise behavior
 * closely enough for deterministic terrain generation on the server side.
 */

/** Simple seeded PRNG (mulberry32) for noise seed derivation */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fade function for smooth interpolation (6t^5 - 15t^4 + 10t^3) */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * 2D gradient noise using a permutation table seeded by the given seed.
 * Returns values in approximately [-1, 1].
 */
export function createNoise2D(seed: number): (x: number, y: number) => number {
  // Build permutation table
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // 2D gradient vectors (8 directions)
  const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0];
  const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1];

  function grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    return GRAD_X[h] * x + GRAD_Y[h] * y;
  }

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    );
  };
}

export interface NoiseConfig {
  seed: number;
  octaves: number;       // 1-6
  persistence: number;   // 0.1-0.9, amplitude decay per octave
  lacunarity: number;    // frequency growth per octave (typically 2.0)
  scale: number;         // base frequency scale (lower = broader features)
}

/**
 * Multi-octave fractal noise at a 2D point.
 * Returns values in approximately [-1, 1].
 */
export function fractalNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  config: NoiseConfig,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = config.scale;
  let maxAmplitude = 0;

  for (let i = 0; i < config.octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= config.persistence;
    frequency *= config.lacunarity;
  }

  return value / maxAmplitude;
}
