import { z } from 'zod';
import { TerrainMaterialSchema } from './sculptSpec.js';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const MaterialColorSpecSchema = z.object({
  colors: z.record(
    TerrainMaterialSchema,
    z.string().regex(HEX_COLOR_REGEX, 'Must be hex color #RRGGBB'),
  ),
});

export type MaterialColorSpec = z.infer<typeof MaterialColorSpecSchema>;

export function validateMaterialColorSpec(raw: unknown): { spec: MaterialColorSpec; warnings: string[] } {
  const warnings: string[] = [];
  const spec = MaterialColorSpecSchema.parse(raw);
  return { spec, warnings };
}
