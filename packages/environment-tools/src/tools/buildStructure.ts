import { v4 as uuidv4 } from 'uuid';
import { validateStructureSpec } from '../schema/structureSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface BuildStructureResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

const STRUCTURE_TEMPLATE_MAP: Record<string, string> = {
  house: 'structure_house.luau',
  tower: 'structure_tower.luau',
};

export function prepareBuildStructure(rawInput: unknown): BuildStructureResult {
  const { spec, warnings } = validateStructureSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const tmpl = STRUCTURE_TEMPLATE_MAP[spec.template];
  if (!tmpl) {
    throw new Error(
      `Structure template "${spec.template}" is not yet implemented. Available: ${Object.keys(STRUCTURE_TEMPLATE_MAP).join(', ')}`
    );
  }

  const params: RenderParams = {
    posX: spec.position.x,
    posY: spec.position.y,
    posZ: spec.position.z,
    scale: spec.scale,
    material: spec.material,
    seed: spec.seed ?? Math.floor(Math.random() * 100000),
    opId: opId,
  };

  const luauSource = renderTemplate(tmpl, params);
  return { ok: true, warnings, luauSource, opId };
}
