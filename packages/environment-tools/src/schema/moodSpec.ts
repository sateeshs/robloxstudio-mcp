import { z } from 'zod';

export const MoodPresetSchema = z.enum([
  'morning', 'noon', 'sunset', 'night', 'spooky', 'underwater', 'alien',
]);

export type MoodPreset = z.infer<typeof MoodPresetSchema>;

export const MoodSpecSchema = z.object({
  preset: MoodPresetSchema,
  fogDensity: z.number().min(0).max(1).optional(),
  overrides: z.object({
    clockTime: z.number().min(0).max(24).optional(),
    brightness: z.number().min(0).max(10).optional(),
    ambientHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).optional(),
});

export type MoodSpec = z.infer<typeof MoodSpecSchema>;

export function validateMoodSpec(raw: unknown): { spec: MoodSpec; warnings: string[] } {
  const warnings: string[] = [];
  const spec = MoodSpecSchema.parse(raw);
  return { spec, warnings };
}
