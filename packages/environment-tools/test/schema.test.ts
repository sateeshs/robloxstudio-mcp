import { validateTerrainSpec, TerrainSpecSchema } from '../src/schema/terrainSpec.js';
import { ClearSpecSchema } from '../src/schema/clearSpec.js';
import { validateMoodSpec, MoodSpecSchema } from '../src/schema/moodSpec.js';
import { validateScatterSpec, ScatterSpecSchema } from '../src/schema/scatterSpec.js';
import { validateStructureSpec, StructureSpecSchema } from '../src/schema/structureSpec.js';
import { validateAssetSpec, AssetSpecSchema } from '../src/schema/assetSpec.js';

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

  test('accepts all biome types', () => {
    for (const biome of ['flat', 'forest', 'desert', 'snow', 'island', 'plains', 'mountains']) {
      const result = TerrainSpecSchema.parse({ biome });
      expect(result.biome).toBe(biome);
    }
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

describe('MoodSpecSchema', () => {
  test('parses valid preset with defaults', () => {
    const result = MoodSpecSchema.parse({ preset: 'sunset' });
    expect(result.preset).toBe('sunset');
    expect(result.fogDensity).toBeUndefined();
    expect(result.overrides).toBeUndefined();
  });

  test('parses all preset types', () => {
    for (const preset of ['morning', 'noon', 'sunset', 'night', 'spooky', 'underwater', 'alien']) {
      const result = MoodSpecSchema.parse({ preset });
      expect(result.preset).toBe(preset);
    }
  });

  test('parses with fogDensity', () => {
    const result = MoodSpecSchema.parse({ preset: 'night', fogDensity: 0.8 });
    expect(result.fogDensity).toBe(0.8);
  });

  test('parses with overrides', () => {
    const result = MoodSpecSchema.parse({
      preset: 'morning',
      overrides: { clockTime: 6.5, brightness: 2, ambientHex: '#FF8800' },
    });
    expect(result.overrides?.clockTime).toBe(6.5);
    expect(result.overrides?.brightness).toBe(2);
    expect(result.overrides?.ambientHex).toBe('#FF8800');
  });

  test('rejects invalid preset', () => {
    expect(() => MoodSpecSchema.parse({ preset: 'rainbow' })).toThrow();
  });

  test('rejects fogDensity out of range', () => {
    expect(() => MoodSpecSchema.parse({ preset: 'noon', fogDensity: 1.5 })).toThrow();
  });

  test('rejects invalid ambientHex', () => {
    expect(() => MoodSpecSchema.parse({
      preset: 'noon',
      overrides: { ambientHex: 'not-a-color' },
    })).toThrow();
  });
});

describe('validateMoodSpec', () => {
  test('returns no warnings for valid input', () => {
    const { spec, warnings } = validateMoodSpec({ preset: 'sunset' });
    expect(spec.preset).toBe('sunset');
    expect(warnings).toHaveLength(0);
  });
});

describe('ScatterSpecSchema', () => {
  test('parses valid template scatter with defaults', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'template', name: 'tree_pine' },
      count: 50,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 256, z: 256 } },
    });
    expect(result.source).toEqual({ kind: 'template', name: 'tree_pine' });
    expect(result.count).toBe(50);
    expect(result.align).toBe('terrain');
    expect(result.randomRotation).toBe(true);
    expect(result.minSpacing).toBe(4);
  });

  test('clamps count above maximum', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'template', name: 'rock' },
      count: 999,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 128, z: 128 } },
    });
    expect(result.count).toBe(500);
  });

  test('clamps count below minimum', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'template', name: 'rock' },
      count: 0,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 128, z: 128 } },
    });
    expect(result.count).toBe(1);
  });

  test('clamps scale range', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'template', name: 'bush' },
      count: 10,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 64, z: 64 } },
      scaleRange: [0.1, 10],
    });
    expect(result.scaleRange![0]).toBe(0.25);
    expect(result.scaleRange![1]).toBe(4);
  });

  test('accepts instancePath source', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'instancePath', path: 'MyFolder.MyModel' },
      count: 5,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 100, z: 100 } },
    });
    expect(result.source).toEqual({ kind: 'instancePath', path: 'MyFolder.MyModel' });
  });

  test('accepts assetId source', () => {
    const result = ScatterSpecSchema.parse({
      source: { kind: 'assetId', id: 12345 },
      count: 3,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 50, z: 50 } },
    });
    expect(result.source).toEqual({ kind: 'assetId', id: 12345 });
  });

  test('rejects invalid template name', () => {
    expect(() => ScatterSpecSchema.parse({
      source: { kind: 'template', name: 'dragon' },
      count: 1,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 64, z: 64 } },
    })).toThrow();
  });
});

describe('validateScatterSpec', () => {
  test('returns warnings when count is clamped', () => {
    const { spec, warnings } = validateScatterSpec({
      source: { kind: 'template', name: 'rock' },
      count: 999,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 128, z: 128 } },
    });
    expect(spec.count).toBe(500);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('count clamped');
  });
});

describe('StructureSpecSchema', () => {
  test('parses valid house with defaults', () => {
    const result = StructureSpecSchema.parse({
      template: 'house',
      position: { x: 50, y: 0, z: 50 },
    });
    expect(result.template).toBe('house');
    expect(result.scale).toBe(1);
    expect(result.material).toBe('wood');
  });

  test('parses tower with all options', () => {
    const result = StructureSpecSchema.parse({
      template: 'tower',
      position: { x: 0, y: 0, z: 0 },
      scale: 2,
      material: 'stone',
      seed: 42,
    });
    expect(result.template).toBe('tower');
    expect(result.scale).toBe(2);
    expect(result.material).toBe('stone');
    expect(result.seed).toBe(42);
  });

  test('clamps scale below minimum', () => {
    const result = StructureSpecSchema.parse({
      template: 'house',
      position: { x: 0, y: 0, z: 0 },
      scale: 0.1,
    });
    expect(result.scale).toBe(0.5);
  });

  test('clamps scale above maximum', () => {
    const result = StructureSpecSchema.parse({
      template: 'tower',
      position: { x: 0, y: 0, z: 0 },
      scale: 10,
    });
    expect(result.scale).toBe(3);
  });

  test('rejects invalid template', () => {
    expect(() => StructureSpecSchema.parse({
      template: 'castle',
      position: { x: 0, y: 0, z: 0 },
    })).toThrow();
  });

  test('rejects invalid material', () => {
    expect(() => StructureSpecSchema.parse({
      template: 'house',
      position: { x: 0, y: 0, z: 0 },
      material: 'gold',
    })).toThrow();
  });

  test('accepts all valid materials', () => {
    for (const material of ['wood', 'stone', 'brick', 'ice', 'neon']) {
      const result = StructureSpecSchema.parse({
        template: 'house',
        position: { x: 0, y: 0, z: 0 },
        material,
      });
      expect(result.material).toBe(material);
    }
  });
});

describe('validateStructureSpec', () => {
  test('returns warnings when scale is clamped', () => {
    const { spec, warnings } = validateStructureSpec({
      template: 'house',
      position: { x: 0, y: 0, z: 0 },
      scale: 5,
    });
    expect(spec.scale).toBe(3);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('scale clamped');
  });

  test('returns no warnings for valid input', () => {
    const { warnings } = validateStructureSpec({
      template: 'tower',
      position: { x: 0, y: 0, z: 0 },
    });
    expect(warnings).toHaveLength(0);
  });
});

describe('AssetSpecSchema', () => {
  test('parses valid prompt with defaults', () => {
    const result = AssetSpecSchema.parse({ prompt: 'a small wizard tower' });
    expect(result.prompt).toBe('a small wizard tower');
    expect(result.predefinedSchema).toBeUndefined();
    expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.anchorToTerrain).toBe(false);
  });

  test('parses with all options', () => {
    const result = AssetSpecSchema.parse({
      prompt: 'red sports car',
      predefinedSchema: 'Car5',
      boundingBox: { x: 10, y: 4, z: 5 },
      position: { x: 50, y: 0, z: 50 },
      anchorToTerrain: true,
      name: 'MyCar',
    });
    expect(result.predefinedSchema).toBe('Car5');
    expect(result.boundingBox).toEqual({ x: 10, y: 4, z: 5 });
    expect(result.anchorToTerrain).toBe(true);
    expect(result.name).toBe('MyCar');
  });

  test('rejects empty prompt', () => {
    expect(() => AssetSpecSchema.parse({ prompt: '' })).toThrow();
  });

  test('rejects prompt over 200 characters', () => {
    const longPrompt = 'a'.repeat(201);
    expect(() => AssetSpecSchema.parse({ prompt: longPrompt })).toThrow();
  });

  test('accepts prompt at exactly 200 characters', () => {
    const maxPrompt = 'a'.repeat(200);
    const result = AssetSpecSchema.parse({ prompt: maxPrompt });
    expect(result.prompt).toHaveLength(200);
  });

  test('rejects invalid predefinedSchema', () => {
    expect(() => AssetSpecSchema.parse({
      prompt: 'test',
      predefinedSchema: 'InvalidSchema',
    })).toThrow();
  });

  test('rejects missing prompt', () => {
    expect(() => AssetSpecSchema.parse({})).toThrow();
  });
});

describe('validateAssetSpec', () => {
  test('returns no warnings for valid input', () => {
    const { spec, warnings } = validateAssetSpec({ prompt: 'a small rock' });
    expect(spec.prompt).toBe('a small rock');
    expect(warnings).toHaveLength(0);
  });
});
