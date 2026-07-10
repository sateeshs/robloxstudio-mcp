import { describe, it, expect } from '@jest/globals';
import { validateEffectSpec } from '../src/schema/effectSpec.js';
import { prepareAddEffect } from '../src/tools/addEffect.js';

describe('EffectSpec schema', () => {
  it('parses valid fire effect', () => {
    const { spec } = validateEffectSpec({
      effect: 'fire',
      position: { x: 10, y: 5, z: 10 },
    });
    expect(spec.effect).toBe('fire');
    expect(spec.position).toEqual({ x: 10, y: 5, z: 10 });
    expect(spec.size).toBe(3);
    expect(spec.intensity).toBe(0.7);
  });

  it('applies defaults', () => {
    const { spec } = validateEffectSpec({ effect: 'smoke' });
    expect(spec.position).toEqual({ x: 0, y: 5, z: 0 });
    expect(spec.size).toBe(3);
    expect(spec.intensity).toBe(0.7);
    expect(spec.radius).toBe(20);
    expect(spec.enabled).toBe(true);
    expect(spec.looped).toBe(true);
  });

  it('accepts custom color', () => {
    const { spec } = validateEffectSpec({ effect: 'sparkles', color: '#FF00FF' });
    expect(spec.color).toBe('#FF00FF');
  });

  it('rejects invalid effect type', () => {
    expect(() => validateEffectSpec({ effect: 'laser_beam' })).toThrow();
  });

  it('rejects invalid hex color', () => {
    expect(() => validateEffectSpec({ effect: 'fire', color: 'red' })).toThrow();
  });

  it('rejects out-of-range size', () => {
    expect(() => validateEffectSpec({ effect: 'fire', size: 100 })).toThrow();
  });

  it('accepts all effect types', () => {
    const types = [
      'fire', 'smoke', 'sparkles', 'rain', 'snow', 'magic', 'dust', 'embers',
      'torch_light', 'spotlight', 'neon_glow', 'campfire_light',
      'explosion',
      'ambient_fire', 'ambient_wind', 'ambient_water', 'ambient_rain',
      'ambient_birds', 'ambient_cave', 'ambient_music',
    ];
    for (const effect of types) {
      const { spec } = validateEffectSpec({ effect });
      expect(spec.effect).toBe(effect);
    }
  });
});

describe('prepareAddEffect', () => {
  it('generates Luau for fire effect', () => {
    const result = prepareAddEffect({
      effect: 'fire',
      position: { x: 5, y: 3, z: 5 },
      size: 5,
    });
    expect(result.ok).toBe(true);
    expect(result.opId).toHaveLength(8);
    expect(result.luauSource).toContain('local effectType = "fire"');
    expect(result.luauSource).toContain('local posX = 5');
    expect(result.luauSource).toContain('local size = 5');
    expect(result.luauSource).toContain('ParticleEmitter');
  });

  it('generates Luau with custom color', () => {
    const result = prepareAddEffect({
      effect: 'magic',
      color: '#8050FF',
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local hasColor = true');
    expect(result.luauSource).toContain('local colorR = 128');
    expect(result.luauSource).toContain('local colorG = 80');
    expect(result.luauSource).toContain('local colorB = 255');
  });

  it('generates Luau for ambient sound', () => {
    const result = prepareAddEffect({
      effect: 'ambient_birds',
      radius: 50,
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('local effectType = "ambient_birds"');
    expect(result.luauSource).toContain('local radius = 50');
  });

  it('generates Luau for explosion', () => {
    const result = prepareAddEffect({
      effect: 'explosion',
      position: { x: 0, y: 10, z: 0 },
      radius: 30,
    });
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('"explosion"');
    expect(result.luauSource).toContain('local radius = 30');
  });

  it('uses custom name when provided', () => {
    const result = prepareAddEffect({
      effect: 'torch_light',
      name: 'MyTorch',
    });
    expect(result.luauSource).toContain('"MyTorch"');
  });
});
