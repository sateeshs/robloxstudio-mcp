import { describe, it, expect } from '@jest/globals';
import { validateAssetSpec } from '../src/schema/assetSpec.js';
import { prepareGenerateAsset } from '../src/tools/generateAsset.js';

describe('AssetSpec schema — M9 enhanced fields', () => {
  it('accepts customSchema with groups', () => {
    const { spec } = validateAssetSpec({
      prompt: 'dragon',
      customSchema: { groups: ['body', 'wings', 'tail'] },
    });
    expect(spec.customSchema?.groups).toEqual(['body', 'wings', 'tail']);
    expect(spec.predefinedSchema).toBeUndefined();
  });

  it('rejects both predefinedSchema and customSchema', () => {
    expect(() =>
      validateAssetSpec({
        prompt: 'car',
        predefinedSchema: 'Car5',
        customSchema: { groups: ['chassis'] },
      })
    ).toThrow('Cannot specify both');
  });

  it('accepts imageAssetId', () => {
    const { spec } = validateAssetSpec({
      prompt: 'chair',
      imageAssetId: 12345678,
    });
    expect(spec.imageAssetId).toBe(12345678);
  });

  it('accepts scale within range', () => {
    const { spec } = validateAssetSpec({ prompt: 'rock', scale: 2.5 });
    expect(spec.scale).toBe(2.5);
  });

  it('rejects scale out of range', () => {
    expect(() => validateAssetSpec({ prompt: 'rock', scale: 0.01 })).toThrow();
    expect(() => validateAssetSpec({ prompt: 'rock', scale: 20 })).toThrow();
  });

  it('accepts saveName', () => {
    const { spec } = validateAssetSpec({ prompt: 'tree', saveName: 'oak_v1' });
    expect(spec.saveName).toBe('oak_v1');
  });

  it('rejects empty customSchema groups', () => {
    expect(() =>
      validateAssetSpec({ prompt: 'x', customSchema: { groups: [] } })
    ).toThrow();
  });

  it('rejects more than 8 groups', () => {
    expect(() =>
      validateAssetSpec({
        prompt: 'x',
        customSchema: { groups: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] },
      })
    ).toThrow();
  });

  it('defaults to Body1 when neither schema provided', () => {
    const { spec } = validateAssetSpec({ prompt: 'test' });
    expect(spec.predefinedSchema).toBe('Body1');
    expect(spec.customSchema).toBeUndefined();
  });
});

describe('prepareGenerateAsset — M9 features', () => {
  it('generates Luau with custom schema groups', () => {
    const result = prepareGenerateAsset({
      prompt: 'fantasy creature',
      customSchema: { groups: ['body', 'wings', 'tail'] },
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasCustomSchema = true');
    expect(result.luauSource).toContain('"body","wings","tail"');
    expect(result.luauSource).toContain('SchemaDefinition');
  });

  it('generates Luau with image reference', () => {
    const result = prepareGenerateAsset({
      prompt: 'wooden chair',
      imageAssetId: 98765432,
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasImageRef = true');
    expect(result.luauSource).toContain('local imageAssetId = 98765432');
    expect(result.luauSource).toContain('Content.fromAssetId(imageAssetId)');
  });

  it('generates Luau with scale', () => {
    const result = prepareGenerateAsset({
      prompt: 'big rock',
      scale: 3,
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasScale = true');
    expect(result.luauSource).toContain('local scaleVal = 3');
    expect(result.luauSource).toContain('ScaleTo');
  });

  it('generates Luau with saveName', () => {
    const result = prepareGenerateAsset({
      prompt: 'tree',
      saveName: 'saved_tree',
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasSaveName = true');
    expect(result.luauSource).toContain('EnvToolsSaveName');
  });

  it('uses predefined schema when no custom schema', () => {
    const result = prepareGenerateAsset({
      prompt: 'sports car',
      predefinedSchema: 'Car5',
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasCustomSchema = false');
    expect(result.luauSource).toContain('PredefinedSchema');
  });
});
