import { v4 as uuidv4 } from 'uuid';
import { renderTemplate } from '../luau/render.js';

export interface SnapshotSceneResult {
  ok: boolean;
  luauSource: string;
  opId: string;
}

export function prepareSnapshotScene(): SnapshotSceneResult {
  const opId = uuidv4().slice(0, 8);
  const luauSource = renderTemplate('snapshot.luau', { opId });
  return { ok: true, luauSource, opId };
}
