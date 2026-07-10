import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const EffectTypeSchema = z.enum([
  // Particle effects
  'fire', 'smoke', 'sparkles', 'rain', 'snow', 'magic', 'dust', 'embers',
  // Lights
  'torch_light', 'spotlight', 'neon_glow', 'campfire_light',
  // Physics
  'explosion',
  // Sound
  'ambient_fire', 'ambient_wind', 'ambient_water', 'ambient_rain',
  'ambient_birds', 'ambient_cave', 'ambient_music',
]);

export type EffectType = z.infer<typeof EffectTypeSchema>;

export const EffectSpecSchema = z.object({
  effect: EffectTypeSchema,
  position: Vec3Schema.default({ x: 0, y: 5, z: 0 }),
  color: z.string().regex(HEX_COLOR_REGEX, 'Must be hex color #RRGGBB').optional(),
  size: z.number().min(0.1).max(50).default(3),
  intensity: z.number().min(0).max(1).default(0.7),
  radius: z.number().min(1).max(200).default(20),
  enabled: z.boolean().default(true),
  looped: z.boolean().default(true),
  name: z.string().max(100).optional(),
});

export type EffectSpec = z.infer<typeof EffectSpecSchema>;

export function validateEffectSpec(raw: unknown): { spec: EffectSpec; warnings: string[] } {
  const warnings: string[] = [];
  const spec = EffectSpecSchema.parse(raw);
  return { spec, warnings };
}
