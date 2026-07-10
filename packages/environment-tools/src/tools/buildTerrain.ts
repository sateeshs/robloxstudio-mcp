import { v4 as uuidv4 } from 'uuid';
import { validateTerrainSpec } from '../schema/terrainSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

/** Height variation → Luau string literal for template lookup */
const HEIGHT_VARIATION_MAP: Record<string, string> = {
  flat: 'flat',
  gentle: 'gentle',
  hilly: 'hilly',
  mountainous: 'mountainous',
};

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

export interface BuildTerrainResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

export function prepareBuildTerrain(rawInput: unknown): BuildTerrainResult {
  const { spec, warnings } = validateTerrainSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  let templateName: string;
  let params: RenderParams;

  if (spec.biome === 'flat') {
    templateName = 'terrain_fill.luau';
    params = {
      originX: spec.origin.x,
      originY: spec.origin.y,
      originZ: spec.origin.z,
      sizeX: spec.size.x,
      sizeZ: spec.size.z,
      material: FLAT_MATERIAL_MAP[spec.biome] ?? 'Grass',
      opId: opId,
    };
  } else if (spec.biome === 'forest') {
    templateName = 'terrain_biome_forest.luau';
    params = {
      originX: spec.origin.x,
      originY: spec.origin.y,
      originZ: spec.origin.z,
      sizeX: spec.size.x,
      sizeZ: spec.size.z,
      heightVariation: HEIGHT_VARIATION_MAP[spec.heightVariation] ?? 'gentle',
      water: spec.water,
      seed: spec.seed ?? Math.floor(Math.random() * 100000),
      opId: opId,
    };
  } else {
    throw new Error(`Biome "${spec.biome}" is not yet implemented. Available: flat, forest`);
  }

  const luauSource = renderTemplate(templateName, params);

  return { ok: true, warnings, luauSource, opId };
}
