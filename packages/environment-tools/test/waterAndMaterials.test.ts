import { describe, it, expect } from '@jest/globals';
import { validateWaterSpec } from '../src/schema/waterSpec.js';
import { validateMaterialColorSpec } from '../src/schema/materialColorSpec.js';
import { prepareConfigureWater } from '../src/tools/configureWater.js';
import { prepareSetMaterialColors } from '../src/tools/setMaterialColors.js';

describe('WaterSpec schema', () => {
  it('parses valid spec with all fields', () => {
    const { spec, warnings } = validateWaterSpec({
      color: '#1E90FF',
      transparency: 0.5,
      reflectance: 0.8,
      waveSize: 0.3,
      waveSpeed: 20,
    });
    expect(spec.color).toBe('#1E90FF');
    expect(spec.transparency).toBe(0.5);
    expect(spec.reflectance).toBe(0.8);
    expect(spec.waveSize).toBe(0.3);
    expect(spec.waveSpeed).toBe(20);
    expect(warnings).toHaveLength(0);
  });

  it('applies defaults when fields omitted', () => {
    const { spec } = validateWaterSpec({});
    expect(spec.color).toBeUndefined();
    expect(spec.transparency).toBe(0.3);
    expect(spec.reflectance).toBe(1);
    expect(spec.waveSize).toBe(0.15);
    expect(spec.waveSpeed).toBe(10);
  });

  it('rejects invalid hex color', () => {
    expect(() => validateWaterSpec({ color: 'red' })).toThrow();
    expect(() => validateWaterSpec({ color: '#GGG' })).toThrow();
  });

  it('rejects out-of-range transparency', () => {
    expect(() => validateWaterSpec({ transparency: 2 })).toThrow();
    expect(() => validateWaterSpec({ transparency: -1 })).toThrow();
  });
});

describe('MaterialColorSpec schema', () => {
  it('parses valid material color map', () => {
    const { spec, warnings } = validateMaterialColorSpec({
      colors: { Grass: '#2E8B57', Rock: '#696969' },
    });
    expect(spec.colors.Grass).toBe('#2E8B57');
    expect(spec.colors.Rock).toBe('#696969');
    expect(warnings).toHaveLength(0);
  });

  it('rejects invalid material name', () => {
    expect(() =>
      validateMaterialColorSpec({ colors: { FakeMaterial: '#FFFFFF' } })
    ).toThrow();
  });

  it('rejects invalid hex color value', () => {
    expect(() =>
      validateMaterialColorSpec({ colors: { Grass: 'green' } })
    ).toThrow();
  });
});

describe('prepareConfigureWater', () => {
  it('returns valid Luau source with color', () => {
    const result = prepareConfigureWater({
      color: '#00CED1',
      transparency: 0.4,
      reflectance: 0.6,
      waveSize: 0.2,
      waveSpeed: 15,
    });
    expect(result.ok).toBe(true);
    expect(result.opId).toHaveLength(8);
    expect(result.luauSource).toContain('WaterColor');
    expect(result.luauSource).toContain('Color3.fromRGB(0, 206, 209)');
    expect(result.luauSource).toContain('WaterTransparency = 0.4');
    expect(result.luauSource).toContain('WaterReflectance = 0.6');
    expect(result.luauSource).toContain('WaterWaveSize = 0.2');
    expect(result.luauSource).toContain('WaterWaveSpeed = 15');
  });

  it('skips color when not provided', () => {
    const result = prepareConfigureWater({});
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasColor = false');
  });
});

describe('prepareSetMaterialColors', () => {
  it('returns valid Luau source with color entries', () => {
    const result = prepareSetMaterialColors({
      colors: { Grass: '#00FF00', Sand: '#FFCC00' },
    });
    expect(result.ok).toBe(true);
    expect(result.opId).toHaveLength(8);
    expect(result.luauSource).toContain('mat="Grass"');
    expect(result.luauSource).toContain('r=0,g=255,b=0');
    expect(result.luauSource).toContain('mat="Sand"');
    expect(result.luauSource).toContain('r=255,g=204,b=0');
  });

  it('handles single material', () => {
    const result = prepareSetMaterialColors({
      colors: { Rock: '#808080' },
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('mat="Rock"');
    expect(result.luauSource).toContain('r=128,g=128,b=128');
  });
});
