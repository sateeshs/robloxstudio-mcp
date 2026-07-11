import { validateCitySpec, CitySpecSchema } from '../src/schema/citySpec.js';
import { prepareBuildCity } from '../src/tools/buildCity.js';
import { setTemplatesDir } from '../src/luau/render.js';
import * as path from 'path';

// Point renderer at source templates
beforeAll(() => {
  setTemplatesDir(path.resolve(__dirname, '..', 'src', 'luau', 'templates'));
});

describe('CitySpecSchema', () => {
  test('parses minimal input with defaults', () => {
    const result = CitySpecSchema.parse({});
    expect(result.layout).toBe('grid');
    expect(result.gridSize).toBe(3);
    expect(result.blockSize).toBe(120);
    expect(result.streetWidth).toBe(24);
    expect(result.style).toBe('modern');
    expect(result.sidewalks).toBe(true);
    expect(result.streetLights).toBe(true);
    expect(result.streetTrees).toBe(true);
    expect(result.parks).toBe(true);
    expect(result.ambientLife).toBe(true);
    expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('parses full input', () => {
    const result = CitySpecSchema.parse({
      layout: 'grid',
      gridSize: 4,
      blockSize: 150,
      streetWidth: 30,
      buildings: ['house', 'shop'],
      style: 'medieval',
      sidewalks: false,
      streetLights: false,
      streetTrees: true,
      parks: true,
      ambientLife: false,
      position: { x: 100, y: 5, z: -50 },
      seed: 42,
    });
    expect(result.gridSize).toBe(4);
    expect(result.blockSize).toBe(150);
    expect(result.streetWidth).toBe(30);
    expect(result.buildings).toEqual(['house', 'shop']);
    expect(result.style).toBe('medieval');
    expect(result.sidewalks).toBe(false);
    expect(result.seed).toBe(42);
  });

  test('clamps gridSize below minimum', () => {
    const result = CitySpecSchema.parse({ gridSize: 0 });
    expect(result.gridSize).toBe(1);
  });

  test('clamps gridSize above maximum', () => {
    const result = CitySpecSchema.parse({ gridSize: 20 });
    expect(result.gridSize).toBe(6);
  });

  test('clamps blockSize below minimum', () => {
    const result = CitySpecSchema.parse({ blockSize: 10 });
    expect(result.blockSize).toBe(60);
  });

  test('clamps blockSize above maximum', () => {
    const result = CitySpecSchema.parse({ blockSize: 500 });
    expect(result.blockSize).toBe(200);
  });

  test('clamps streetWidth below minimum', () => {
    const result = CitySpecSchema.parse({ streetWidth: 5 });
    expect(result.streetWidth).toBe(12);
  });

  test('clamps streetWidth above maximum', () => {
    const result = CitySpecSchema.parse({ streetWidth: 100 });
    expect(result.streetWidth).toBe(40);
  });

  test('rejects invalid style', () => {
    expect(() => CitySpecSchema.parse({ style: 'gothic' })).toThrow();
  });

  test('rejects invalid building type', () => {
    expect(() => CitySpecSchema.parse({ buildings: ['castle'] })).toThrow();
  });
});

describe('validateCitySpec', () => {
  test('returns warnings on clamped gridSize', () => {
    const { spec, warnings } = validateCitySpec({ gridSize: 10 });
    expect(spec.gridSize).toBe(6);
    expect(warnings).toContain('gridSize clamped from 10 to 6');
  });

  test('returns warnings on clamped blockSize', () => {
    const { spec, warnings } = validateCitySpec({ blockSize: 300 });
    expect(spec.blockSize).toBe(200);
    expect(warnings).toContain('blockSize clamped from 300 to 200');
  });

  test('returns warnings on clamped streetWidth', () => {
    const { spec, warnings } = validateCitySpec({ streetWidth: 5 });
    expect(spec.streetWidth).toBe(12);
    expect(warnings).toContain('streetWidth clamped from 5 to 12');
  });

  test('returns no warnings for valid input', () => {
    const { warnings } = validateCitySpec({ gridSize: 3, blockSize: 120 });
    expect(warnings).toEqual([]);
  });
});

describe('prepareBuildCity', () => {
  test('produces valid luau source with defaults', () => {
    const result = prepareBuildCity({});
    expect(result.ok).toBe(true);
    expect(result.opId).toHaveLength(8);
    expect(result.luauSource).toContain('[ENVTOOLS:');
    expect(result.luauSource).toContain('BEGIN');
    expect(result.luauSource).toContain('END');
    expect(result.luauSource).toContain('ChangeHistoryService');
    expect(result.luauSource).toContain('CollectionService');
    expect(result.luauSource).toContain('EnvTools');
  });

  test('renders seed into template', () => {
    const result = prepareBuildCity({ seed: 12345 });
    expect(result.luauSource).toContain('Random.new(12345)');
  });

  test('renders style into template', () => {
    const result = prepareBuildCity({ style: 'medieval' });
    expect(result.luauSource).toContain('"medieval"');
  });

  test('renders gridSize into template', () => {
    const result = prepareBuildCity({ gridSize: 4 });
    expect(result.luauSource).toContain('local gridSize = 4');
  });

  test('renders position into template', () => {
    const result = prepareBuildCity({ position: { x: 100, y: 5, z: -50 } });
    expect(result.luauSource).toContain('local posX = 100');
    expect(result.luauSource).toContain('local posY = 5');
    expect(result.luauSource).toContain('local posZ = -50');
  });

  test('renders building list into template', () => {
    const result = prepareBuildCity({ buildings: ['house', 'shop'] });
    expect(result.luauSource).toContain('"house,shop"');
  });

  test('renders boolean options into template', () => {
    const result = prepareBuildCity({ sidewalks: false, streetLights: true });
    expect(result.luauSource).toContain('local hasSidewalks = false');
    expect(result.luauSource).toContain('local hasStreetLights = true');
  });

  test('passes through clamping warnings', () => {
    const result = prepareBuildCity({ gridSize: 20 });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('gridSize clamped');
  });
});
