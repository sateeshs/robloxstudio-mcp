import { v4 as uuidv4 } from 'uuid';
import { validateMaterialColorSpec } from '../schema/materialColorSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface SetMaterialColorsResult {
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

/** Encode color entries as a Luau table literal */
function encodeColorEntries(colors: Record<string, string>): string {
  const entries = Object.entries(colors).map(([mat, hex]) => {
    const rgb = hexToRgb(hex);
    return `{mat="${mat}",r=${rgb.r},g=${rgb.g},b=${rgb.b}}`;
  });
  return `{${entries.join(',')}}`;
}

export function prepareSetMaterialColors(rawInput: unknown): SetMaterialColorsResult {
  const { spec, warnings } = validateMaterialColorSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const params: RenderParams = {
    opId,
  };

  let luauSource = renderTemplate('set_material_colors.luau', params);
  luauSource = luauSource.replace('--[[COLOR_ENTRIES]]{}', encodeColorEntries(spec.colors));

  return { ok: true, warnings, luauSource, opId };
}
