import { validateSceneSpec, SceneSpecSchema } from '../src/schema/sceneSpec.js';
import { prepareComposeScene, executeComposeScene } from '../src/tools/composeScene.js';
import type { StepExecutor } from '../src/tools/composeScene.js';

describe('SceneSpecSchema', () => {
  test('parses minimal scene with just terrain', () => {
    const result = SceneSpecSchema.parse({
      terrain: { biome: 'forest' },
    });
    expect(result.terrain).toBeDefined();
    expect(result.terrain!.biome).toBe('forest');
    expect(result.mood).toBeUndefined();
    expect(result.structures).toBeUndefined();
  });

  test('parses full scene with all sections', () => {
    const result = SceneSpecSchema.parse({
      terrain: { biome: 'snow', water: true },
      mood: { preset: 'night' },
      structures: [{ template: 'tower', position: { x: 0, y: 0, z: 0 } }],
      scatters: [{
        source: { kind: 'template', name: 'snowman' },
        count: 10,
        area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 200, z: 200 } },
      }],
      assets: [{ prompt: 'a wizard statue' }],
    });
    expect(result.terrain!.biome).toBe('snow');
    expect(result.mood!.preset).toBe('night');
    expect(result.structures).toHaveLength(1);
    expect(result.scatters).toHaveLength(1);
    expect(result.assets).toHaveLength(1);
  });

  test('parses empty scene (all optional)', () => {
    const result = SceneSpecSchema.parse({});
    expect(result.terrain).toBeUndefined();
    expect(result.mood).toBeUndefined();
  });

  test('rejects invalid biome in terrain', () => {
    expect(() => SceneSpecSchema.parse({
      terrain: { biome: 'mars' },
    })).toThrow();
  });

  test('rejects invalid mood preset', () => {
    expect(() => SceneSpecSchema.parse({
      mood: { preset: 'rainbow' },
    })).toThrow();
  });
});

describe('validateSceneSpec', () => {
  test('clamps structures array to max 20', () => {
    const structures = Array.from({ length: 25 }, (_, i) => ({
      template: 'house',
      position: { x: i * 10, y: 0, z: 0 },
    }));
    const { spec, warnings } = validateSceneSpec({ structures });
    expect(spec.structures).toHaveLength(20);
    expect(warnings).toContain('structures clamped from 25 to 20');
  });

  test('clamps scatters array to max 10', () => {
    const scatters = Array.from({ length: 12 }, () => ({
      source: { kind: 'template', name: 'rock' },
      count: 5,
      area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 100, z: 100 } },
    }));
    const { spec, warnings } = validateSceneSpec({ scatters });
    expect(spec.scatters).toHaveLength(10);
    expect(warnings).toContain('scatters clamped from 12 to 10');
  });

  test('clamps assets array to max 5', () => {
    const assets = Array.from({ length: 8 }, (_, i) => ({
      prompt: `asset ${i}`,
    }));
    const { spec, warnings } = validateSceneSpec({ assets });
    expect(spec.assets).toHaveLength(5);
    expect(warnings).toContain('assets clamped from 8 to 5');
  });
});

describe('prepareComposeScene', () => {
  test('returns sceneId and validated spec', () => {
    const result = prepareComposeScene({
      terrain: { biome: 'desert' },
      mood: { preset: 'sunset' },
    });
    expect(result.sceneId).toMatch(/^[a-f0-9]{8}$/);
    expect(result.spec.terrain!.biome).toBe('desert');
    expect(result.spec.mood!.preset).toBe('sunset');
  });

  test('throws on empty scene', () => {
    expect(() => prepareComposeScene({})).toThrow('SceneSpec is empty');
  });
});

describe('executeComposeScene', () => {
  const mockExecutor: StepExecutor = async (toolName) => {
    return { ok: true, opId: `mock-${toolName}` };
  };

  const failingExecutor: StepExecutor = async (toolName) => {
    if (toolName === 'set_mood') {
      return { ok: false, error: 'Mood failed' };
    }
    return { ok: true, opId: `mock-${toolName}` };
  };

  test('executes steps in correct order', async () => {
    const callOrder: string[] = [];
    const orderTracker: StepExecutor = async (toolName) => {
      callOrder.push(toolName);
      return { ok: true, opId: `mock-${toolName}` };
    };

    const spec = SceneSpecSchema.parse({
      terrain: { biome: 'forest' },
      mood: { preset: 'sunset' },
      structures: [{ template: 'house', position: { x: 0, y: 0, z: 0 } }],
      scatters: [{
        source: { kind: 'template', name: 'tree_pine' },
        count: 10,
        area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 100, z: 100 } },
      }],
    });

    await executeComposeScene(spec, 'test-id', orderTracker);
    expect(callOrder).toEqual([
      'build_terrain',
      'set_mood',
      'build_structure',
      'scatter_objects',
    ]);
  });

  test('all steps succeed', async () => {
    const spec = SceneSpecSchema.parse({
      terrain: { biome: 'snow' },
      mood: { preset: 'night' },
    });
    const { steps, allOk } = await executeComposeScene(spec, 'test-id', mockExecutor);
    expect(allOk).toBe(true);
    expect(steps).toHaveLength(2);
    expect(steps[0].step).toBe('build_terrain');
    expect(steps[1].step).toBe('set_mood');
  });

  test('continues after partial failure', async () => {
    const spec = SceneSpecSchema.parse({
      terrain: { biome: 'desert' },
      mood: { preset: 'sunset' },
      structures: [{ template: 'tower', position: { x: 0, y: 0, z: 0 } }],
    });
    const { steps, allOk } = await executeComposeScene(spec, 'test-id', failingExecutor);
    expect(allOk).toBe(false);
    expect(steps).toHaveLength(3);
    expect(steps[0].ok).toBe(true);  // terrain succeeded
    expect(steps[1].ok).toBe(false); // mood failed
    expect(steps[1].error).toBe('Mood failed');
    expect(steps[2].ok).toBe(true);  // structure still ran
  });

  test('skips sections not in spec', async () => {
    const spec = SceneSpecSchema.parse({
      mood: { preset: 'morning' },
    });
    const { steps, allOk } = await executeComposeScene(spec, 'test-id', mockExecutor);
    expect(allOk).toBe(true);
    expect(steps).toHaveLength(1);
    expect(steps[0].step).toBe('set_mood');
  });

  test('handles multiple structures and scatters', async () => {
    const spec = SceneSpecSchema.parse({
      structures: [
        { template: 'house', position: { x: 0, y: 0, z: 0 } },
        { template: 'tower', position: { x: 50, y: 0, z: 50 } },
      ],
      scatters: [
        { source: { kind: 'template', name: 'rock' }, count: 5, area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 100, z: 100 } } },
        { source: { kind: 'template', name: 'bush' }, count: 10, area: { origin: { x: 0, y: 0, z: 0 }, size: { x: 200, z: 200 } } },
      ],
    });
    const { steps } = await executeComposeScene(spec, 'test-id', mockExecutor);
    expect(steps).toHaveLength(4);
    expect(steps[0].step).toBe('build_structure[0]');
    expect(steps[1].step).toBe('build_structure[1]');
    expect(steps[2].step).toBe('scatter_objects[0]');
    expect(steps[3].step).toBe('scatter_objects[1]');
  });
});
