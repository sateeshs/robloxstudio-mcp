import { v4 as uuidv4 } from 'uuid';
import { validateScatterSpec } from '../schema/scatterSpec.js';
import { renderTemplate } from '../luau/render.js';
import type { RenderParams } from '../luau/render.js';
import type { ScatterSpec } from '../schema/scatterSpec.js';

export interface ScatterObjectsResult {
  ok: boolean;
  warnings: string[];
  luauSource: string;
  opId: string;
}

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PlacedPoint {
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

/** Server-side deterministic scatter placement (Poisson-like rejection sampling) */
function computePlacements(spec: ScatterSpec): PlacedPoint[] {
  const seed = spec.seed ?? Math.floor(Math.random() * 100000);
  const rng = mulberry32(seed);

  const halfX = spec.area.size.x / 2;
  const halfZ = spec.area.size.z / 2;
  const originX = spec.area.origin.x;
  const originZ = spec.area.origin.z;
  const minSpacing = spec.minSpacing;
  const scaleMin = spec.scaleRange?.[0] ?? 1;
  const scaleMax = spec.scaleRange?.[1] ?? 1;

  const points: PlacedPoint[] = [];
  const maxAttempts = spec.count * 10;
  let attempts = 0;

  while (points.length < spec.count && attempts < maxAttempts) {
    attempts++;
    const x = originX + (rng() * 2 - 1) * halfX;
    const z = originZ + (rng() * 2 - 1) * halfZ;

    // Check spacing against existing points
    let tooClose = false;
    if (minSpacing > 0) {
      for (const p of points) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < minSpacing * minSpacing) {
          tooClose = true;
          break;
        }
      }
    }
    if (tooClose) continue;

    const rotation = spec.randomRotation ? rng() * 360 : 0;
    const scale = scaleMin + rng() * (scaleMax - scaleMin);
    points.push({ x, z, rotation, scale });
  }

  return points;
}

/** Encode placements as a Luau table literal */
function encodePlacements(points: PlacedPoint[]): string {
  const entries = points.map(
    p => `{x=${p.x.toFixed(2)},z=${p.z.toFixed(2)},r=${p.rotation.toFixed(1)},s=${p.scale.toFixed(3)}}`
  );
  return `{${entries.join(',')}}`;
}

export function prepareScatterObjects(rawInput: unknown): ScatterObjectsResult {
  const { spec, warnings } = validateScatterSpec(rawInput);
  const opId = uuidv4().slice(0, 8);

  const placements = computePlacements(spec);
  if (placements.length < spec.count) {
    warnings.push(`Only placed ${placements.length}/${spec.count} objects due to spacing constraints`);
  }

  // Determine source type for template
  let sourceKind: string;
  let sourceName: string;
  if (spec.source.kind === 'template') {
    sourceKind = 'template';
    sourceName = spec.source.name;
  } else if (spec.source.kind === 'instancePath') {
    sourceKind = 'instancePath';
    sourceName = spec.source.path;
  } else {
    sourceKind = 'assetId';
    sourceName = spec.source.id.toString();
  }

  const params: RenderParams = {
    sourceKind: sourceKind,
    sourceName: sourceName,
    alignMode: spec.align,
    originY: spec.area.origin.y,
    opId: opId,
  };

  // We inject placements as a raw Luau table, not through the normal param system
  const luauTemplate = renderTemplate('scatter.luau', params);
  // Replace the PLACEMENTS_DATA marker with the computed placement data
  const luauSource = luauTemplate.replace('--[[PLACEMENTS_DATA]]', encodePlacements(placements));

  return { ok: true, warnings, luauSource, opId };
}
