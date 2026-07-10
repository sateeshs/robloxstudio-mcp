import { v4 as uuidv4 } from 'uuid';
import { ClearSpecSchema } from '../schema/clearSpec.js';
import { renderTemplate } from '../luau/render.js';

export interface ClearEnvironmentResult {
  ok: boolean;
  luauSource: string;
  opId: string;
}

export function prepareClearEnvironment(rawInput: unknown): ClearEnvironmentResult {
  ClearSpecSchema.parse(rawInput);
  const opId = uuidv4().slice(0, 8);

  const luauSource = renderTemplate('clear_env.luau', { opId });

  return { ok: true, luauSource, opId };
}
