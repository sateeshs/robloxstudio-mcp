import { validateTerrainSpec, TerrainSpecSchema } from '../src/schema/terrainSpec.js';
import { ClearSpecSchema } from '../src/schema/clearSpec.js';

describe('TerrainSpecSchema', () => {
  test('parses valid flat terrain with defaults', () => {
    const result = TerrainSpecSchema.parse({ biome: 'flat' });
    expect(result.biome).toBe('flat');
    expect(result.size).toEqual({ x: 512, z: 512 });
    expect(result.heightVariation).toBe('gentle');
    expect(result.water).toBe(false);
    expect(result.origin).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('parses valid forest terrain with all options', () => {
    const result = TerrainSpecSchema.parse({
      biome: 'forest',
      size: { x: 1024, z: 256 },
      heightVariation: 'hilly',
      water: true,
      seed: 42,
      origin: { x: 100, y: 10, z: -50 },
    });
    expect(result.biome).toBe('forest');
    expect(result.size.x).toBe(1024);
    expect(result.size.z).toBe(256);
    expect(result.heightVariation).toBe('hilly');
    expect(result.water).toBe(true);
    expect(result.seed).toBe(42);
  });

  test('clamps size.x below minimum', () => {
    const result = TerrainSpecSchema.parse({ biome: 'flat', size: { x: 10, z: 512 } });
    expect(result.size.x).toBe(64);
  });

  test('clamps size.x above maximum', () => {
    const result = TerrainSpecSchema.parse({ biome: 'flat', size: { x: 9999, z: 512 } });
    expect(result.size.x).toBe(2048);
  });

  test('clamps size.z below minimum', () => {
    const result = TerrainSpecSchema.parse({ biome: 'flat', size: { x: 512, z: 1 } });
    expect(result.size.z).toBe(64);
  });

  test('rejects invalid biome', () => {
    expect(() => TerrainSpecSchema.parse({ biome: 'lava' })).toThrow();
  });

  test('rejects invalid heightVariation', () => {
    expect(() => TerrainSpecSchema.parse({ biome: 'flat', heightVariation: 'extreme' })).toThrow();
  });

  test('rejects missing biome', () => {
    expect(() => TerrainSpecSchema.parse({})).toThrow();
  });
});

describe('validateTerrainSpec', () => {
  test('returns warnings when size is clamped', () => {
    const { spec, warnings } = validateTerrainSpec({ biome: 'flat', size: { x: 10, z: 5000 } });
    expect(spec.size.x).toBe(64);
    expect(spec.size.z).toBe(2048);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('size.x clamped');
    expect(warnings[1]).toContain('size.z clamped');
  });

  test('returns no warnings when size is in range', () => {
    const { warnings } = validateTerrainSpec({ biome: 'forest', size: { x: 512, z: 512 } });
    expect(warnings).toHaveLength(0);
  });
});

describe('ClearSpecSchema', () => {
  test('accepts confirm: true', () => {
    const result = ClearSpecSchema.parse({ confirm: true });
    expect(result.confirm).toBe(true);
  });

  test('rejects confirm: false', () => {
    expect(() => ClearSpecSchema.parse({ confirm: false })).toThrow('confirm must be true');
  });

  test('rejects missing confirm', () => {
    expect(() => ClearSpecSchema.parse({})).toThrow();
  });
});
