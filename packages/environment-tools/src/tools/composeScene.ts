import { v4 as uuidv4 } from 'uuid';
import { validateSceneSpec } from '../schema/sceneSpec.js';
import type { SceneSpec } from '../schema/sceneSpec.js';

export interface StepResult {
  step: string;
  ok: boolean;
  opId?: string;
  warnings: string[];
  error?: string;
  durationMs: number;
}

export interface ComposeSceneResult {
  ok: boolean;
  warnings: string[];
  sceneId: string;
  steps: StepResult[];
  summary: string;
}

export type StepExecutor = (
  toolName: string,
  body: Record<string, unknown>,
) => Promise<{ ok: boolean; opId?: string; error?: string }>;

/**
 * Validate the SceneSpec and return an execution plan (ordered steps).
 * The actual execution is done by the handler in register.ts which has
 * access to the tools/bridge.
 */
export function prepareComposeScene(rawInput: unknown): {
  spec: SceneSpec;
  warnings: string[];
  sceneId: string;
} {
  const { spec, warnings } = validateSceneSpec(rawInput);
  const sceneId = uuidv4().slice(0, 8);

  if (!spec.terrain && !spec.mood && !spec.structures?.length &&
      !spec.scatters?.length && !spec.assets?.length) {
    throw new Error('SceneSpec is empty — provide at least one of: terrain, mood, structures, scatters, assets');
  }

  return { spec, warnings, sceneId };
}

/**
 * Execute the scene composition step-by-step using the provided executor.
 * Order: terrain → mood → structures → scatters → assets
 * Continues on partial failure — reports per-step results.
 */
export async function executeComposeScene(
  spec: SceneSpec,
  sceneId: string,
  execute: StepExecutor,
): Promise<{ steps: StepResult[]; allOk: boolean }> {
  const steps: StepResult[] = [];

  // 1. Terrain
  if (spec.terrain) {
    const start = Date.now();
    const result = await execute('build_terrain', spec.terrain as unknown as Record<string, unknown>);
    steps.push({
      step: 'build_terrain',
      ok: result.ok,
      opId: result.opId,
      warnings: [],
      error: result.ok ? undefined : result.error,
      durationMs: Date.now() - start,
    });
  }

  // 2. Mood
  if (spec.mood) {
    const start = Date.now();
    const result = await execute('set_mood', spec.mood as unknown as Record<string, unknown>);
    steps.push({
      step: 'set_mood',
      ok: result.ok,
      opId: result.opId,
      warnings: [],
      error: result.ok ? undefined : result.error,
      durationMs: Date.now() - start,
    });
  }

  // 3. Structures (sequential — each creates instances)
  if (spec.structures?.length) {
    for (let i = 0; i < spec.structures.length; i++) {
      const start = Date.now();
      const result = await execute('build_structure', spec.structures[i] as unknown as Record<string, unknown>);
      steps.push({
        step: `build_structure[${i}]`,
        ok: result.ok,
        opId: result.opId,
        warnings: [],
        error: result.ok ? undefined : result.error,
        durationMs: Date.now() - start,
      });
    }
  }

  // 4. Scatters (sequential — each batch places objects)
  if (spec.scatters?.length) {
    for (let i = 0; i < spec.scatters.length; i++) {
      const start = Date.now();
      const result = await execute('scatter_objects', spec.scatters[i] as unknown as Record<string, unknown>);
      steps.push({
        step: `scatter_objects[${i}]`,
        ok: result.ok,
        opId: result.opId,
        warnings: [],
        error: result.ok ? undefined : result.error,
        durationMs: Date.now() - start,
      });
    }
  }

  // 5. Assets (sequential — each calls GenerationService)
  if (spec.assets?.length) {
    for (let i = 0; i < spec.assets.length; i++) {
      const start = Date.now();
      const result = await execute('generate_asset', spec.assets[i] as unknown as Record<string, unknown>);
      steps.push({
        step: `generate_asset[${i}]`,
        ok: result.ok,
        opId: result.opId,
        warnings: [],
        error: result.ok ? undefined : result.error,
        durationMs: Date.now() - start,
      });
    }
  }

  const allOk = steps.every(s => s.ok);
  return { steps, allOk };
}
