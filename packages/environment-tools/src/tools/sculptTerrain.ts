import { v4 as uuidv4 } from 'uuid';
import { validateSculptSpec } from '../schema/sculptSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface SculptTerrainResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

export function prepareSculptTerrain(rawInput: unknown): SculptTerrainResult {
  const { spec, warnings } = validateSculptSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const params: RenderParams = {
    operation: spec.operation,
    shape: spec.shape,
    posX: spec.position.x,
    posY: spec.position.y,
    posZ: spec.position.z,
    sizeX: spec.size.x,
    sizeY: spec.size.y,
    sizeZ: spec.size.z,
    material: spec.material ?? 'Grass',
    sourceMaterial: spec.sourceMaterial ?? 'Rock',
    strength: spec.strength,
    opId: opId,
  };

  const luauSource = renderTemplate('sculpt_terrain.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
