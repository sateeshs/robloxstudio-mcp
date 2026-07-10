import { v4 as uuidv4 } from 'uuid';
import { validateWaterSpec } from '../schema/waterSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface ConfigureWaterResult {
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

export function prepareConfigureWater(rawInput: unknown): ConfigureWaterResult {
  const { spec, warnings } = validateWaterSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const hasColor = spec.color !== undefined;
  const rgb = hasColor ? hexToRgb(spec.color!) : { r: 0, g: 0, b: 0 };

  const params: RenderParams = {
    hasColor,
    colorR: rgb.r,
    colorG: rgb.g,
    colorB: rgb.b,
    transparency: spec.transparency,
    reflectance: spec.reflectance,
    waveSize: spec.waveSize,
    waveSpeed: spec.waveSpeed,
    opId,
  };

  const luauSource = renderTemplate('configure_water.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
