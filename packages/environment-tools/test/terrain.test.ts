import { createNoise2D, fractalNoise2D } from '../src/terrain/noise.js';
import type { NoiseConfig } from '../src/terrain/noise.js';
import { computeHeightmap, encodeHeightmapForLuau, VOXEL_SIZE, MATERIAL } from '../src/terrain/heightmap.js';
import { createBiomeConfig } from '../src/terrain/biomes.js';

describe('noise', () => {
  test('createNoise2D is deterministic (same seed = same output)', () => {
    const noise1 = createNoise2D(42);
    const noise2 = createNoise2D(42);
    for (let i = 0; i < 20; i++) {
      const x = i * 0.7;
      const y = i * 1.3;
      expect(noise1(x, y)).toBe(noise2(x, y));
    }
  });

  test('createNoise2D produces different output for different seeds', () => {
    const noise1 = createNoise2D(42);
    const noise2 = createNoise2D(99);
    let diffCount = 0;
    for (let i = 0; i < 20; i++) {
      if (noise1(i * 0.5, i * 0.5) !== noise2(i * 0.5, i * 0.5)) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(5);
  });

  test('noise values are bounded', () => {
    const noise = createNoise2D(123);
    for (let x = -50; x < 50; x += 0.37) {
      for (let y = -50; y < 50; y += 0.37) {
        const v = noise(x, y);
        expect(v).toBeGreaterThanOrEqual(-2);
        expect(v).toBeLessThanOrEqual(2);
      }
    }
  });

  test('fractalNoise2D produces values in [-1, 1] range', () => {
    const noise = createNoise2D(42);
    const config: NoiseConfig = {
      seed: 42,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
      scale: 0.01,
    };
    for (let x = 0; x < 100; x += 3) {
      for (let y = 0; y < 100; y += 3) {
        const v = fractalNoise2D(noise, x, y, config);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

describe('biomes', () => {
  const biomeNames = ['forest', 'desert', 'snow', 'island', 'plains', 'mountains', 'swamp', 'volcanic', 'jungle', 'savanna', 'mesa'];

  test.each(biomeNames)('createBiomeConfig returns valid config for %s', (biome) => {
    const config = createBiomeConfig(biome, 42, 'gentle', false);
    expect(config.maxHeight).toBeGreaterThan(0);
    expect(config.noiseConfig.octaves).toBeGreaterThanOrEqual(1);
    expect(config.noiseConfig.octaves).toBeLessThanOrEqual(6);
    expect(config.materialRules.length).toBeGreaterThan(0);
    expect(config.defaultMaterial).toBeDefined();
  });

  test('water level is set when addWater=true', () => {
    const config = createBiomeConfig('forest', 42, 'gentle', true);
    expect(config.waterLevel).toBeGreaterThan(0);
  });

  test('water level is 0 when addWater=false (non-island)', () => {
    const config = createBiomeConfig('forest', 42, 'gentle', false);
    expect(config.waterLevel).toBe(0);
  });

  test('island always has water', () => {
    const config = createBiomeConfig('island', 42, 'gentle', false);
    expect(config.waterLevel).toBeGreaterThan(0);
  });

  test('height variation affects maxHeight', () => {
    const flat = createBiomeConfig('forest', 42, 'flat', false);
    const mountainous = createBiomeConfig('forest', 42, 'mountainous', false);
    expect(mountainous.maxHeight).toBeGreaterThan(flat.maxHeight);
  });

  test('throws on unknown biome', () => {
    expect(() => createBiomeConfig('mars', 42, 'gentle', false)).toThrow('Unknown biome');
  });
});

describe('heightmap', () => {
  test('computeHeightmap returns correct dimensions', () => {
    const config = createBiomeConfig('plains', 42, 'gentle', false);
    const hm = computeHeightmap(config, 128, 128, 0, 0);
    expect(hm.width).toBe(Math.ceil(128 / VOXEL_SIZE));
    expect(hm.depth).toBe(Math.ceil(128 / VOXEL_SIZE));
    expect(hm.heights.length).toBe(hm.width * hm.depth);
    expect(hm.materials.length).toBe(hm.width * hm.depth);
  });

  test('all heights are non-negative', () => {
    const config = createBiomeConfig('mountains', 42, 'hilly', false);
    const hm = computeHeightmap(config, 256, 256, 0, 0);
    for (let i = 0; i < hm.heights.length; i++) {
      expect(hm.heights[i]).toBeGreaterThanOrEqual(0);
    }
  });

  test('maxHeight is accurate', () => {
    const config = createBiomeConfig('forest', 42, 'gentle', false);
    const hm = computeHeightmap(config, 128, 128, 0, 0);
    let actualMax = 0;
    for (let i = 0; i < hm.heights.length; i++) {
      if (hm.heights[i] > actualMax) actualMax = hm.heights[i];
    }
    expect(hm.maxHeight).toBeCloseTo(actualMax, 1);
  });

  test('is deterministic (same seed = same heightmap)', () => {
    const config1 = createBiomeConfig('desert', 42, 'gentle', false);
    const config2 = createBiomeConfig('desert', 42, 'gentle', false);
    const hm1 = computeHeightmap(config1, 64, 64, 0, 0);
    const hm2 = computeHeightmap(config2, 64, 64, 0, 0);
    for (let i = 0; i < hm1.heights.length; i++) {
      expect(hm1.heights[i]).toBe(hm2.heights[i]);
      expect(hm1.materials[i]).toBe(hm2.materials[i]);
    }
  });

  test('island has radial falloff (center region higher than edge region)', () => {
    const config = createBiomeConfig('island', 42, 'hilly', false);
    const hm = computeHeightmap(config, 512, 512, 0, 0);
    // Average height in center 25% vs edge 25%
    let centerSum = 0, centerCount = 0;
    let edgeSum = 0, edgeCount = 0;
    for (let gz = 0; gz < hm.depth; gz++) {
      for (let gx = 0; gx < hm.width; gx++) {
        const nx = gx / hm.width;
        const nz = gz / hm.depth;
        const h = hm.heights[gz * hm.width + gx];
        if (nx > 0.35 && nx < 0.65 && nz > 0.35 && nz < 0.65) {
          centerSum += h; centerCount++;
        } else if (nx < 0.1 || nx > 0.9 || nz < 0.1 || nz > 0.9) {
          edgeSum += h; edgeCount++;
        }
      }
    }
    const centerAvg = centerSum / centerCount;
    const edgeAvg = edgeSum / edgeCount;
    expect(centerAvg).toBeGreaterThan(edgeAvg);
  });

  test('materials are valid indices', () => {
    const config = createBiomeConfig('snow', 42, 'hilly', true);
    const hm = computeHeightmap(config, 128, 128, 0, 0);
    for (let i = 0; i < hm.materials.length; i++) {
      expect(hm.materials[i]).toBeGreaterThanOrEqual(0);
      expect(hm.materials[i]).toBeLessThanOrEqual(17);
    }
  });
});

describe('encodeHeightmapForLuau', () => {
  test('produces valid Luau table literals', () => {
    const config = createBiomeConfig('plains', 42, 'flat', false);
    const hm = computeHeightmap(config, 64, 64, 0, 0);
    const { heightsLiteral, materialsLiteral } = encodeHeightmapForLuau(hm);

    expect(heightsLiteral).toMatch(/^\{[\d.,]+\}$/);
    expect(materialsLiteral).toMatch(/^\{[\d,]+\}$/);

    // Verify entry count matches grid size
    const hCount = heightsLiteral.slice(1, -1).split(',').length;
    const mCount = materialsLiteral.slice(1, -1).split(',').length;
    expect(hCount).toBe(hm.width * hm.depth);
    expect(mCount).toBe(hm.width * hm.depth);
  });
});

// Sculpt schema tests
import { validateSculptSpec, SculptSpecSchema } from '../src/schema/sculptSpec.js';
import { prepareSculptTerrain } from '../src/tools/sculptTerrain.js';

describe('SculptSpecSchema', () => {
  test('parses valid fill operation', () => {
    const result = SculptSpecSchema.parse({
      operation: 'fill',
      shape: 'ball',
      position: { x: 0, y: 10, z: 0 },
      size: { x: 40, y: 40, z: 40 },
      material: 'Rock',
    });
    expect(result.operation).toBe('fill');
    expect(result.shape).toBe('ball');
    expect(result.material).toBe('Rock');
  });

  test('defaults shape to ball', () => {
    const result = SculptSpecSchema.parse({
      operation: 'subtract',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 20, y: 20, z: 20 },
    });
    expect(result.shape).toBe('ball');
  });

  test('clamps size values', () => {
    const { warnings } = validateSculptSpec({
      operation: 'fill',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 2, y: 600, z: 50 },
    });
    expect(warnings.some(w => w.includes('size.x clamped'))).toBe(true);
    expect(warnings.some(w => w.includes('size.y clamped'))).toBe(true);
  });

  test('rejects invalid operation', () => {
    expect(() => SculptSpecSchema.parse({
      operation: 'explode',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 10, y: 10, z: 10 },
    })).toThrow();
  });

  test('all operations are valid', () => {
    for (const op of ['fill', 'subtract', 'smooth', 'replace_material', 'paint']) {
      const result = SculptSpecSchema.parse({
        operation: op,
        position: { x: 0, y: 0, z: 0 },
        size: { x: 20, y: 20, z: 20 },
      });
      expect(result.operation).toBe(op);
    }
  });

  test('all shapes are valid', () => {
    for (const shape of ['block', 'ball', 'cylinder', 'wedge']) {
      const result = SculptSpecSchema.parse({
        operation: 'fill',
        shape,
        position: { x: 0, y: 0, z: 0 },
        size: { x: 20, y: 20, z: 20 },
      });
      expect(result.shape).toBe(shape);
    }
  });
});

describe('prepareSculptTerrain', () => {
  test('generates valid luau source', () => {
    const result = prepareSculptTerrain({
      operation: 'fill',
      shape: 'block',
      position: { x: 10, y: 5, z: -10 },
      size: { x: 30, y: 20, z: 30 },
      material: 'Sand',
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('ENVTOOLS');
    expect(result.opId).toMatch(/^[a-f0-9]{8}$/);
  });
});
