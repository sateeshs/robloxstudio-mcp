import { z } from 'zod';

const TERRAIN_SIZE_MIN = 64;
const TERRAIN_SIZE_MAX = 2048;
const DEFAULT_SIZE = { x: 512, z: 512 };

export const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vec3 = z.infer<typeof Vec3Schema>;

export const BiomeSchema = z.enum([
  'forest', 'desert', 'snow', 'island', 'plains', 'mountains', 'flat',
  'swamp', 'volcanic', 'jungle', 'savanna', 'mesa',
]);

export type Biome = z.infer<typeof BiomeSchema>;

export const HeightVariationSchema = z.enum([
  'flat', 'gentle', 'hilly', 'mountainous',
]);

export type HeightVariation = z.infer<typeof HeightVariationSchema>;

export const TerrainSpecSchema = z.object({
  biome: BiomeSchema,
  size: z.object({
    x: z.number().transform(v => Math.min(Math.max(v, TERRAIN_SIZE_MIN), TERRAIN_SIZE_MAX)),
    z: z.number().transform(v => Math.min(Math.max(v, TERRAIN_SIZE_MIN), TERRAIN_SIZE_MAX)),
  }).default(DEFAULT_SIZE),
  heightVariation: HeightVariationSchema.default('gentle'),
  water: z.boolean().default(false),
  seed: z.number().int().optional(),
  origin: Vec3Schema.default({ x: 0, y: 0, z: 0 }),
});

export type TerrainSpec = z.infer<typeof TerrainSpecSchema>;

/** Returns warnings for any clamped values. */
export function validateTerrainSpec(raw: unknown): { spec: TerrainSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const size = typeof obj.size === 'object' && obj.size !== null
    ? obj.size as Record<string, unknown>
    : {};

  const rawX = typeof size.x === 'number' ? size.x : undefined;
  const rawZ = typeof size.z === 'number' ? size.z : undefined;

  if (rawX !== undefined && (rawX < TERRAIN_SIZE_MIN || rawX > TERRAIN_SIZE_MAX)) {
    warnings.push(`size.x clamped from ${rawX} to ${Math.min(Math.max(rawX, TERRAIN_SIZE_MIN), TERRAIN_SIZE_MAX)}`);
  }
  if (rawZ !== undefined && (rawZ < TERRAIN_SIZE_MIN || rawZ > TERRAIN_SIZE_MAX)) {
    warnings.push(`size.z clamped from ${rawZ} to ${Math.min(Math.max(rawZ, TERRAIN_SIZE_MIN), TERRAIN_SIZE_MAX)}`);
  }

  const spec = TerrainSpecSchema.parse(raw);
  return { spec, warnings };
}
