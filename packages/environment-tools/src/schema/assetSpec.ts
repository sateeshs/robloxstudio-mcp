import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const PROMPT_MAX_LENGTH = 200;

export const PredefinedSchemaEnum = z.enum(['Body1', 'Car5']);

export const AssetSpecSchema = z.object({
  prompt: z.string().min(1).max(PROMPT_MAX_LENGTH),
  predefinedSchema: PredefinedSchemaEnum.default('Body1'),
  boundingBox: Vec3Schema.optional(),
  position: Vec3Schema.default({ x: 0, y: 0, z: 0 }),
  anchorToTerrain: z.boolean().default(false),
  name: z.string().max(100).optional(),
});

export type AssetSpec = z.infer<typeof AssetSpecSchema>;

export function validateAssetSpec(raw: unknown): { spec: AssetSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const rawPrompt = typeof obj.prompt === 'string' ? obj.prompt : '';
  if (rawPrompt.length > PROMPT_MAX_LENGTH) {
    warnings.push(`prompt truncated from ${rawPrompt.length} to ${PROMPT_MAX_LENGTH} characters`);
  }

  const spec = AssetSpecSchema.parse(raw);
  return { spec, warnings };
}
