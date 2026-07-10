import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const SCALE_MIN = 0.5;
const SCALE_MAX = 3;

export const StructureTemplateSchema = z.enum([
  'house', 'tower', 'bridge', 'wall', 'campfire', 'dock',
]);

export type StructureTemplate = z.infer<typeof StructureTemplateSchema>;

export const StructureMaterialSchema = z.enum([
  'wood', 'stone', 'brick', 'ice', 'neon',
]);

export const StructureSpecSchema = z.object({
  template: StructureTemplateSchema,
  position: Vec3Schema,
  scale: z.number()
    .transform(v => Math.min(Math.max(v, SCALE_MIN), SCALE_MAX))
    .default(1),
  material: StructureMaterialSchema.default('wood'),
  seed: z.number().int().optional(),
});

export type StructureSpec = z.infer<typeof StructureSpecSchema>;

export function validateStructureSpec(raw: unknown): { spec: StructureSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const rawScale = typeof obj.scale === 'number' ? obj.scale : undefined;
  if (rawScale !== undefined && (rawScale < SCALE_MIN || rawScale > SCALE_MAX)) {
    warnings.push(`scale clamped from ${rawScale} to ${Math.min(Math.max(rawScale, SCALE_MIN), SCALE_MAX)}`);
  }

  const spec = StructureSpecSchema.parse(raw);
  return { spec, warnings };
}
