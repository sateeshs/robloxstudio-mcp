import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

const GRID_SIZE_MIN = 1;
const GRID_SIZE_MAX = 6;
const BLOCK_SIZE_MIN = 60;
const BLOCK_SIZE_MAX = 200;
const STREET_WIDTH_MIN = 12;
const STREET_WIDTH_MAX = 40;

export const CityLayoutSchema = z.enum(['grid']);

export const CityStyleSchema = z.enum(['modern', 'medieval', 'futuristic']);

export const CityBuildingSchema = z.enum([
  'house', 'shop', 'apartment', 'office', 'skyscraper', 'park',
]);

export const CitySpecSchema = z.object({
  layout: CityLayoutSchema.default('grid'),
  gridSize: z.number()
    .transform(v => Math.min(Math.max(Math.round(v), GRID_SIZE_MIN), GRID_SIZE_MAX))
    .default(3),
  blockSize: z.number()
    .transform(v => Math.min(Math.max(Math.round(v), BLOCK_SIZE_MIN), BLOCK_SIZE_MAX))
    .default(120),
  streetWidth: z.number()
    .transform(v => Math.min(Math.max(Math.round(v), STREET_WIDTH_MIN), STREET_WIDTH_MAX))
    .default(24),
  buildings: z.array(CityBuildingSchema).default(['house', 'shop', 'apartment', 'office', 'skyscraper']),
  style: CityStyleSchema.default('modern'),
  sidewalks: z.boolean().default(true),
  streetLights: z.boolean().default(true),
  streetTrees: z.boolean().default(true),
  parks: z.boolean().default(true),
  ambientLife: z.boolean().default(true),
  position: Vec3Schema.default({ x: 0, y: 0, z: 0 }),
  seed: z.number().int().optional(),
});

export type CitySpec = z.infer<typeof CitySpecSchema>;

export function validateCitySpec(raw: unknown): { spec: CitySpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};

  const rawGridSize = typeof obj.gridSize === 'number' ? obj.gridSize : undefined;
  if (rawGridSize !== undefined && (rawGridSize < GRID_SIZE_MIN || rawGridSize > GRID_SIZE_MAX)) {
    warnings.push(`gridSize clamped from ${rawGridSize} to ${Math.min(Math.max(Math.round(rawGridSize), GRID_SIZE_MIN), GRID_SIZE_MAX)}`);
  }

  const rawBlockSize = typeof obj.blockSize === 'number' ? obj.blockSize : undefined;
  if (rawBlockSize !== undefined && (rawBlockSize < BLOCK_SIZE_MIN || rawBlockSize > BLOCK_SIZE_MAX)) {
    warnings.push(`blockSize clamped from ${rawBlockSize} to ${Math.min(Math.max(Math.round(rawBlockSize), BLOCK_SIZE_MIN), BLOCK_SIZE_MAX)}`);
  }

  const rawStreetWidth = typeof obj.streetWidth === 'number' ? obj.streetWidth : undefined;
  if (rawStreetWidth !== undefined && (rawStreetWidth < STREET_WIDTH_MIN || rawStreetWidth > STREET_WIDTH_MAX)) {
    warnings.push(`streetWidth clamped from ${rawStreetWidth} to ${Math.min(Math.max(Math.round(rawStreetWidth), STREET_WIDTH_MIN), STREET_WIDTH_MAX)}`);
  }

  const spec = CitySpecSchema.parse(raw);
  return { spec, warnings };
}
