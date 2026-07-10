import { z } from 'zod';
import { TerrainSpecSchema } from './terrainSpec.js';
import { MoodSpecSchema } from './moodSpec.js';
import { ScatterSpecSchema } from './scatterSpec.js';
import { StructureSpecSchema } from './structureSpec.js';
import { AssetSpecSchema } from './assetSpec.js';

const MAX_STRUCTURES = 20;
const MAX_SCATTERS = 10;
const MAX_ASSETS = 5;

export const SceneSpecSchema = z.object({
  terrain: TerrainSpecSchema.optional(),
  mood: MoodSpecSchema.optional(),
  structures: z.array(StructureSpecSchema).max(MAX_STRUCTURES).optional(),
  scatters: z.array(ScatterSpecSchema).max(MAX_SCATTERS).optional(),
  assets: z.array(AssetSpecSchema).max(MAX_ASSETS).optional(),
});

export type SceneSpec = z.infer<typeof SceneSpecSchema>;

export function validateSceneSpec(raw: unknown): { spec: SceneSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};

  if (Array.isArray(obj.structures) && obj.structures.length > MAX_STRUCTURES) {
    warnings.push(`structures clamped from ${obj.structures.length} to ${MAX_STRUCTURES}`);
    obj.structures = obj.structures.slice(0, MAX_STRUCTURES);
  }
  if (Array.isArray(obj.scatters) && obj.scatters.length > MAX_SCATTERS) {
    warnings.push(`scatters clamped from ${obj.scatters.length} to ${MAX_SCATTERS}`);
    obj.scatters = obj.scatters.slice(0, MAX_SCATTERS);
  }
  if (Array.isArray(obj.assets) && obj.assets.length > MAX_ASSETS) {
    warnings.push(`assets clamped from ${obj.assets.length} to ${MAX_ASSETS}`);
    obj.assets = obj.assets.slice(0, MAX_ASSETS);
  }

  const spec = SceneSpecSchema.parse(obj);
  return { spec, warnings };
}
