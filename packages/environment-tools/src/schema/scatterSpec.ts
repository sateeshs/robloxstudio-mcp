import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const SCATTER_COUNT_MIN = 1;
const SCATTER_COUNT_MAX = 500;
const SCALE_MIN = 0.25;
const SCALE_MAX = 4;

export const ScatterSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('template'),
    name: z.enum(['tree_pine', 'tree_oak', 'rock', 'bush', 'cactus', 'snowman', 'crystal']),
  }),
  z.object({
    kind: z.literal('instancePath'),
    path: z.string().min(1),
  }),
  z.object({
    kind: z.literal('assetId'),
    id: z.number().int().positive(),
  }),
]);

export type ScatterSource = z.infer<typeof ScatterSourceSchema>;

export const ScatterSpecSchema = z.object({
  source: ScatterSourceSchema,
  count: z.number().int().transform(v => Math.min(Math.max(v, SCATTER_COUNT_MIN), SCATTER_COUNT_MAX)),
  area: z.object({
    origin: Vec3Schema.default({ x: 0, y: 0, z: 0 }),
    size: z.object({
      x: z.number().positive().default(256),
      z: z.number().positive().default(256),
    }),
  }),
  align: z.enum(['terrain', 'yLevel']).default('terrain'),
  randomRotation: z.boolean().default(true),
  scaleRange: z.tuple([
    z.number().transform(v => Math.min(Math.max(v, SCALE_MIN), SCALE_MAX)),
    z.number().transform(v => Math.min(Math.max(v, SCALE_MIN), SCALE_MAX)),
  ]).optional(),
  minSpacing: z.number().min(0).default(4),
  seed: z.number().int().optional(),
});

export type ScatterSpec = z.infer<typeof ScatterSpecSchema>;

export function validateScatterSpec(raw: unknown): { spec: ScatterSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const rawCount = typeof obj.count === 'number' ? obj.count : undefined;
  if (rawCount !== undefined && (rawCount < SCATTER_COUNT_MIN || rawCount > SCATTER_COUNT_MAX)) {
    warnings.push(`count clamped from ${rawCount} to ${Math.min(Math.max(rawCount, SCATTER_COUNT_MIN), SCATTER_COUNT_MAX)}`);
  }

  const spec = ScatterSpecSchema.parse(raw);
  return { spec, warnings };
}
