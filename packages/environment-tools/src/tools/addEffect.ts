import { v4 as uuidv4 } from 'uuid';
import { validateEffectSpec } from '../schema/effectSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface AddEffectResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

/** Parse hex color "#RRGGBB" to {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function prepareAddEffect(rawInput: unknown): AddEffectResult {
  const { spec, warnings } = validateEffectSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const hasColor = spec.color !== undefined;
  const rgb = hasColor ? hexToRgb(spec.color!) : { r: 0, g: 0, b: 0 };
  const effectName = spec.name ?? `Effect_${spec.effect}_${opId}`;

  const params: RenderParams = {
    effectType: spec.effect,
    posX: spec.position.x,
    posY: spec.position.y,
    posZ: spec.position.z,
    hasColor,
    colorR: rgb.r,
    colorG: rgb.g,
    colorB: rgb.b,
    size: spec.size,
    intensity: spec.intensity,
    radius: spec.radius,
    enabled: spec.enabled,
    looped: spec.looped,
    effectName,
    opId,
  };

  const luauSource = renderTemplate('add_effect.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
