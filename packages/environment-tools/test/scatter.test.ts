import { prepareScatterObjects } from '../src/tools/scatterObjects.js';
import { setTemplatesDir } from '../src/luau/render.js';
import * as path from 'path';

// Point to actual template directory for rendering
setTemplatesDir(path.resolve(__dirname, '..', 'src', 'luau', 'templates'));

describe('prepareScatterObjects', () => {
  const baseInput = {
    source: { kind: 'template', name: 'tree_pine' },
    count: 10,
    area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 256, z: 256 } },
    seed: 42,
  };

  test('generates luau source with placements data', () => {
    const result = prepareScatterObjects(baseInput);
    expect(result.ok).toBe(true);
    expect(result.luauSource).toContain('tree_pine');
    // Should have replaced the placement marker with actual data
    expect(result.luauSource).not.toContain('--[[PLACEMENTS_DATA]]');
    expect(result.luauSource).toContain('{x=');
  });

  test('deterministic: same seed produces same output', () => {
    const result1 = prepareScatterObjects(baseInput);
    const result2 = prepareScatterObjects(baseInput);
    // opIds differ (uuid), but placement data should be identical
    const placements1 = result1.luauSource.match(/\{x=[\d.-]+,z=[\d.-]+,r=[\d.-]+,s=[\d.-]+\}/g);
    const placements2 = result2.luauSource.match(/\{x=[\d.-]+,z=[\d.-]+,r=[\d.-]+,s=[\d.-]+\}/g);
    expect(placements1).toEqual(placements2);
  });

  test('respects count', () => {
    const result = prepareScatterObjects({ ...baseInput, count: 5 });
    const placements = result.luauSource.match(/\{x=[\d.-]+,z=[\d.-]+,r=[\d.-]+,s=[\d.-]+\}/g);
    expect(placements).toHaveLength(5);
  });

  test('warns when spacing prevents full count', () => {
    const result = prepareScatterObjects({
      ...baseInput,
      count: 500,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 10, z: 10 } },
      minSpacing: 5,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Only placed');
  });
});
