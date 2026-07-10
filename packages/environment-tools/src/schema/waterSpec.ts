import { z } from 'zod';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const WaterSpecSchema = z.object({
  color: z.string().regex(HEX_COLOR_REGEX, 'Must be hex color #RRGGBB').optional(),
  transparency: z.number().min(0).max(1).default(0.3),
  reflectance: z.number().min(0).max(1).default(1),
  waveSize: z.number().min(0).max(1).default(0.15),
  waveSpeed: z.number().min(0).max(100).default(10),
});

export type WaterSpec = z.infer<typeof WaterSpecSchema>;

export function validateWaterSpec(raw: unknown): { spec: WaterSpec; warnings: string[] } {
  const warnings: string[] = [];
  const spec = WaterSpecSchema.parse(raw);
  return { spec, warnings };
}
