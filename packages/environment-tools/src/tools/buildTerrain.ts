import { v4 as uuidv4 } from 'uuid';
import { validateTerrainSpec } from '../schema/terrainSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';
import { computeHeightmap, encodeHeightmapForLuau, VOXEL_SIZE } from '../terrain/heightmap.js';
import { createBiomeConfig } from '../terrain/biomes.js';

/** Biome → material for flat fills */
const FLAT_MATERIAL_MAP: Record<string, string> = {
  flat: 'Grass',
  plains: 'Grass',
  forest: 'Grass',
  desert: 'Sand',
  snow: 'Snow',
  island: 'Sand',
  mountains: 'Rock',
};

/** Biomes that use the WriteVoxels pipeline */
const VOXEL_BIOMES = new Set([
  'forest', 'desert', 'snow', 'island', 'plains', 'mountains',
  'swamp', 'volcanic', 'jungle', 'savanna', 'mesa',
]);

export interface BuildTerrainResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

export function prepareBuildTerrain(rawInput: unknown): BuildTerrainResult {
  const { spec, warnings } = validateTerrainSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  if (spec.biome === 'flat') {
    // Simple flat fill — no heightmap needed
    const params: RenderParams = {
      originX: spec.origin.x,
      originY: spec.origin.y,
      originZ: spec.origin.z,
      sizeX: spec.size.x,
      sizeZ: spec.size.z,
      material: FLAT_MATERIAL_MAP[spec.biome] ?? 'Grass',
      opId: opId,
    };
    const luauSource = renderTemplate('terrain_fill.luau', params);
    return { ok: true, warnings, luauSource, opId };
  }

  if (!VOXEL_BIOMES.has(spec.biome)) {
    throw new Error(
      `Biome "${spec.biome}" is not supported. Available: flat, forest, desert, snow, island, plains, mountains`
    );
  }

  // WriteVoxels pipeline: compute heightmap server-side, inject into template
  const seed = spec.seed ?? Math.floor(Math.random() * 100000);
  const biomeConfig = createBiomeConfig(spec.biome, seed, spec.heightVariation, spec.water);
  const heightmap = computeHeightmap(
    biomeConfig,
    spec.size.x,
    spec.size.z,
    spec.origin.x,
    spec.origin.z,
  );

  const { heightsLiteral, materialsLiteral } = encodeHeightmapForLuau(heightmap);

  const params: RenderParams = {
    originX: spec.origin.x,
    originY: spec.origin.y,
    originZ: spec.origin.z,
    sizeX: spec.size.x,
    sizeZ: spec.size.z,
    gridWidth: heightmap.width,
    gridDepth: heightmap.depth,
    maxHeight: heightmap.maxHeight,
    waterLevel: heightmap.waterLevel,
    subsurfaceMat: biomeConfig.subsurfaceMaterial,
    opId: opId,
  };

  let luauSource = renderTemplate('terrain_voxel_writer.luau', params);
  // Replace data markers with computed heightmap/material arrays
  luauSource = luauSource.replace('--[[HEIGHTS_DATA]]{}', heightsLiteral);
  luauSource = luauSource.replace('--[[MATERIALS_DATA]]{}', materialsLiteral);

  return { ok: true, warnings, luauSource, opId };
}
