import { v4 as uuidv4 } from 'uuid';
import { validateAssetSpec } from '../schema/assetSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface GenerateAssetResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

export function prepareGenerateAsset(rawInput: unknown): GenerateAssetResult {
  const { spec, warnings } = validateAssetSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const modelName = spec.name ?? `Generated_${opId}`;
  const hasBBox = spec.boundingBox !== undefined;

  const params: RenderParams = {
    promptEscaped: spec.prompt,
    predefinedSchema: spec.predefinedSchema,
    hasBoundingBox: hasBBox,
    bboxX: hasBBox ? spec.boundingBox!.x : 0,
    bboxY: hasBBox ? spec.boundingBox!.y : 0,
    bboxZ: hasBBox ? spec.boundingBox!.z : 0,
    posX: spec.position.x,
    posY: spec.position.y,
    posZ: spec.position.z,
    anchorToTerrain: spec.anchorToTerrain,
    modelName: modelName,
    opId: opId,
  };

  const luauSource = renderTemplate('generate_model.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
