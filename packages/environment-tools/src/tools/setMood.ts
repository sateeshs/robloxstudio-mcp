import { v4 as uuidv4 } from 'uuid';
import { validateMoodSpec } from '../schema/moodSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';

export interface SetMoodResult {
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

export function prepareSetMood(rawInput: unknown): SetMoodResult {
  const { spec, warnings } = validateMoodSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const hasAmbient = spec.overrides?.ambientHex !== undefined;
  const rgb = hasAmbient ? hexToRgb(spec.overrides!.ambientHex!) : { r: 0, g: 0, b: 0 };

  const params: RenderParams = {
    preset: spec.preset,
    fogDensity: spec.fogDensity ?? -1,
    clockTimeOverride: spec.overrides?.clockTime ?? 0,
    brightnessOverride: spec.overrides?.brightness ?? 0,
    ambientR: rgb.r,
    ambientG: rgb.g,
    ambientB: rgb.b,
    hasClockOverride: spec.overrides?.clockTime !== undefined,
    hasBrightnessOverride: spec.overrides?.brightness !== undefined,
    hasAmbientOverride: hasAmbient,
    opId: opId,
  };

  const luauSource = renderTemplate('mood_presets.luau', params);
  return { ok: true, warnings, luauSource, opId };
}
