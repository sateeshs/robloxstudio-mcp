import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const PROMPT_MAX_LENGTH = 200;
const MAX_CUSTOM_GROUPS = 8;
const SCALE_MIN = 0.1;
const SCALE_MAX = 10;

export const PredefinedSchemaEnum = z.enum(['Body1', 'Car5']);

export const CustomSchemaSchema = z.object({
  groups: z.array(z.string().min(1).max(50)).min(1).max(MAX_CUSTOM_GROUPS),
});

export const AssetSpecSchema = z.object({
  prompt: z.string().min(1).max(PROMPT_MAX_LENGTH),
  predefinedSchema: PredefinedSchemaEnum.optional(),
  customSchema: CustomSchemaSchema.optional(),
  boundingBox: Vec3Schema.optional(),
  position: Vec3Schema.default({ x: 0, y: 0, z: 0 }),
  anchorToTerrain: z.boolean().default(false),
  name: z.string().max(100).optional(),
  imageAssetId: z.number().int().positive().optional(),
  scale: z.number().min(SCALE_MIN).max(SCALE_MAX).optional(),
  saveName: z.string().min(1).max(100).optional(),
}).refine(
  (data) => !(data.predefinedSchema && data.customSchema),
  { message: 'Cannot specify both predefinedSchema and customSchema' },
);

export type AssetSpec = z.infer<typeof AssetSpecSchema>;

export function validateAssetSpec(raw: unknown): { spec: AssetSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const rawPrompt = typeof obj.prompt === 'string' ? obj.prompt : '';
  if (rawPrompt.length > PROMPT_MAX_LENGTH) {
    warnings.push(`prompt truncated from ${rawPrompt.length} to ${PROMPT_MAX_LENGTH} characters`);
  }

  // Default predefinedSchema to Body1 only if customSchema is not provided
  const parsed = { ...obj };
  if (!parsed.predefinedSchema && !parsed.customSchema) {
    parsed.predefinedSchema = 'Body1';
  }

  const spec = AssetSpecSchema.parse(parsed);
  return { spec, warnings };
}
