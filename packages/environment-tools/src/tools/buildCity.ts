import { v4 as uuidv4 } from 'uuid';
import { validateCitySpec } from '../schema/citySpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface BuildCityResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

export function prepareBuildCity(rawInput: unknown): BuildCityResult {
  const { spec, warnings } = validateCitySpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const params: RenderParams = {
    posX: spec.position.x,
    posY: spec.position.y,
    posZ: spec.position.z,
    gridSize: spec.gridSize,
    blockSize: spec.blockSize,
    streetWidth: spec.streetWidth,
    style: spec.style,
    sidewalks: spec.sidewalks,
    streetLights: spec.streetLights,
    streetTrees: spec.streetTrees,
    parks: spec.parks,
    ambientLife: spec.ambientLife,
    buildingList: spec.buildings.join(','),
    seed: spec.seed ?? Math.floor(Math.random() * 100000),
    opId,
  };

  const luauSource = renderTemplate('city_grid.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
