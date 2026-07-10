import { z } from 'zod';
import { Vec3Schema } from './terrainSpec.js';

export const SculptOperationSchema = z.enum([
  'fill', 'subtract', 'smooth', 'replace_material', 'paint',
]);

export const SculptShapeSchema = z.enum([
  'block', 'ball', 'cylinder', 'wedge',
]);

export const TerrainMaterialSchema = z.enum([
  'Grass', 'Sand', 'Rock', 'Snow', 'Ice', 'Mud', 'Ground', 'Sandstone',
  'Slate', 'LeafyGrass', 'Basalt', 'CrackedLava', 'Limestone', 'Salt',
  'Water', 'Glacier', 'WoodPlanks', 'Asphalt', 'Brick', 'Cobblestone',
  'Concrete', 'Pavement',
]);

const SIZE_MIN = 4;
const SIZE_MAX = 512;

function clampSize(v: number): number {
  return Math.min(Math.max(v, SIZE_MIN), SIZE_MAX);
}

export const SculptSpecSchema = z.object({
  operation: SculptOperationSchema,
  shape: SculptShapeSchema.default('ball'),
  position: Vec3Schema,
  size: z.object({
    x: z.number().transform(clampSize),
    y: z.number().transform(clampSize),
    z: z.number().transform(clampSize),
  }),
  material: TerrainMaterialSchema.optional(),
  sourceMaterial: TerrainMaterialSchema.optional(),
  strength: z.number().min(0).max(1).default(0.5),
  seed: z.number().int().optional(),
});

export type SculptSpec = z.infer<typeof SculptSpecSchema>;

export function validateSculptSpec(raw: unknown): { spec: SculptSpec; warnings: string[] } {
  const warnings: string[] = [];

  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const size = typeof obj.size === 'object' && obj.size !== null
    ? obj.size as Record<string, number>
    : {};

  for (const axis of ['x', 'y', 'z'] as const) {
    const v = size[axis];
    if (typeof v === 'number' && (v < SIZE_MIN || v > SIZE_MAX)) {
      warnings.push(`size.${axis} clamped from ${v} to ${clampSize(v)}`);
    }
  }

  // Validate operation-specific requirements
  const op = typeof obj.operation === 'string' ? obj.operation : '';
  if (op === 'fill' || op === 'paint') {
    if (!obj.material) {
      warnings.push(`material defaults to Grass for ${op} operation`);
    }
  }
  if (op === 'replace_material') {
    if (!obj.sourceMaterial) {
      warnings.push('sourceMaterial is required for replace_material; defaulting to Rock');
    }
    if (!obj.material) {
      warnings.push('material (target) is required for replace_material; defaulting to Grass');
    }
  }

  const spec = SculptSpecSchema.parse(raw);
  return { spec, warnings };
}
