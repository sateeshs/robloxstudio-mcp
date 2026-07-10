/**
 * Server-side heightmap and material grid computation for WriteVoxels terrain.
 * Generates flat arrays of height + material data that get injected into the
 * Luau voxel writer template.
 */

import { createNoise2D, fractalNoise2D } from './noise.js';
import type { NoiseConfig } from './noise.js';

export const VOXEL_SIZE = 4; // Roblox terrain voxel resolution

/** Roblox Enum.Material indices used in WriteVoxels */
export const MATERIAL = {
  Air: 0,
  Grass: 1,
  Sand: 2,
  Rock: 3,
  Snow: 4,
  Ice: 5,
  Mud: 6,
  Ground: 7,
  Sandstone: 8,
  Slate: 9,
  LeafyGrass: 10,
  Basalt: 11,
  CrackedLava: 12,
  Limestone: 13,
  Salt: 14,
  Water: 15,
  Glacier: 16,
  WoodPlanks: 17,
} as const;

/** Map material index to Roblox Enum.Material name for Luau */
export const MATERIAL_NAMES: Record<number, string> = {
  [MATERIAL.Air]: 'Air',
  [MATERIAL.Grass]: 'Grass',
  [MATERIAL.Sand]: 'Sand',
  [MATERIAL.Rock]: 'Rock',
  [MATERIAL.Snow]: 'Snow',
  [MATERIAL.Ice]: 'Ice',
  [MATERIAL.Mud]: 'Mud',
  [MATERIAL.Ground]: 'Ground',
  [MATERIAL.Sandstone]: 'Sandstone',
  [MATERIAL.Slate]: 'Slate',
  [MATERIAL.LeafyGrass]: 'LeafyGrass',
  [MATERIAL.Basalt]: 'Basalt',
  [MATERIAL.CrackedLava]: 'CrackedLava',
  [MATERIAL.Limestone]: 'Limestone',
  [MATERIAL.Salt]: 'Salt',
  [MATERIAL.Water]: 'Water',
  [MATERIAL.Glacier]: 'Glacier',
  [MATERIAL.WoodPlanks]: 'WoodPlanks',
};

export interface MaterialRule {
  /** Minimum normalized altitude (0-1) to apply this material */
  minAltitude: number;
  /** Maximum normalized altitude (0-1) */
  maxAltitude: number;
  /** Material index */
  material: number;
  /** If set, only apply when slope exceeds this threshold (0-1) */
  minSlope?: number;
}

export interface BiomeConfig {
  noiseConfig: NoiseConfig;
  /** Peak height in studs */
  maxHeight: number;
  /** Height offset (base elevation) */
  baseHeight: number;
  /** Material rules, evaluated in order — first match wins */
  materialRules: MaterialRule[];
  /** Default surface material */
  defaultMaterial: number;
  /** Sub-surface material (fills below surface) */
  subsurfaceMaterial: number;
  /** Water level in studs (0 = no water) */
  waterLevel: number;
  /** Custom height transform (e.g., for island radial falloff) */
  heightTransform?: (
    rawNoise: number,
    nx: number,
    nz: number,
    config: BiomeConfig,
  ) => number;
}

export interface HeightmapData {
  /** Grid width in voxel cells */
  width: number;
  /** Grid depth in voxel cells */
  depth: number;
  /** Flat array of heights in studs, row-major [z * width + x] */
  heights: Float32Array;
  /** Flat array of material indices, same layout */
  materials: Uint8Array;
  /** Maximum height found */
  maxHeight: number;
  /** Water level in studs */
  waterLevel: number;
}

/**
 * Compute the heightmap and material grid for a terrain region.
 */
export function computeHeightmap(
  biome: BiomeConfig,
  sizeX: number,
  sizeZ: number,
  originX: number,
  originZ: number,
): HeightmapData {
  const width = Math.ceil(sizeX / VOXEL_SIZE);
  const depth = Math.ceil(sizeZ / VOXEL_SIZE);
  const heights = new Float32Array(width * depth);
  const materials = new Uint8Array(width * depth);

  const noise = createNoise2D(biome.noiseConfig.seed);
  let maxH = 0;

  // First pass: compute raw heights
  const halfX = sizeX / 2;
  const halfZ = sizeZ / 2;

  for (let gz = 0; gz < depth; gz++) {
    for (let gx = 0; gx < width; gx++) {
      const worldX = originX - halfX + (gx + 0.5) * VOXEL_SIZE;
      const worldZ = originZ - halfZ + (gz + 0.5) * VOXEL_SIZE;

      // Normalized coordinates (0-1) relative to terrain bounds
      const nx = (gx + 0.5) / width;
      const nz = (gz + 0.5) / depth;

      let rawNoise = fractalNoise2D(noise, worldX, worldZ, biome.noiseConfig);

      // Apply biome-specific transform (e.g., island radial falloff)
      if (biome.heightTransform) {
        rawNoise = biome.heightTransform(rawNoise, nx, nz, biome);
      }

      // Map noise [-1,1] to height [baseHeight, baseHeight + maxHeight]
      const h = biome.baseHeight + ((rawNoise + 1) / 2) * biome.maxHeight;
      const idx = gz * width + gx;
      heights[idx] = Math.max(0, h);
      if (h > maxH) maxH = h;
    }
  }

  // Second pass: assign materials based on altitude + slope
  for (let gz = 0; gz < depth; gz++) {
    for (let gx = 0; gx < width; gx++) {
      const idx = gz * width + gx;
      const h = heights[idx];

      // Compute approximate slope from neighbors
      const hL = gx > 0 ? heights[idx - 1] : h;
      const hR = gx < width - 1 ? heights[idx + 1] : h;
      const hU = gz > 0 ? heights[idx - width] : h;
      const hD = gz < depth - 1 ? heights[idx + width] : h;
      const slopeX = Math.abs(hR - hL) / (2 * VOXEL_SIZE);
      const slopeZ = Math.abs(hD - hU) / (2 * VOXEL_SIZE);
      const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
      const normalizedSlope = Math.min(1, slope / 2); // normalize to 0-1

      // Normalized altitude (0-1 relative to maxHeight)
      const totalRange = biome.baseHeight + biome.maxHeight;
      const normalizedAlt = totalRange > 0 ? h / totalRange : 0;

      // Find matching material rule
      let mat = biome.defaultMaterial;
      for (const rule of biome.materialRules) {
        if (normalizedAlt >= rule.minAltitude && normalizedAlt <= rule.maxAltitude) {
          if (rule.minSlope === undefined || normalizedSlope >= rule.minSlope) {
            mat = rule.material;
            break;
          }
        }
      }

      materials[idx] = mat;
    }
  }

  return {
    width,
    depth,
    heights,
    materials,
    maxHeight: maxH,
    waterLevel: biome.waterLevel,
  };
}

/**
 * Encode heightmap data as a compact Luau table literal.
 * Uses a flat string format: "{h1,h2,...}" for heights and "{m1,m2,...}" for materials.
 * This keeps the payload small enough for the bridge.
 */
export function encodeHeightmapForLuau(data: HeightmapData): {
  heightsLiteral: string;
  materialsLiteral: string;
} {
  // Heights: round to 1 decimal place to reduce payload size
  const hEntries: string[] = [];
  for (let i = 0; i < data.heights.length; i++) {
    hEntries.push(data.heights[i].toFixed(1));
  }

  // Materials: integer indices
  const mEntries: string[] = [];
  for (let i = 0; i < data.materials.length; i++) {
    mEntries.push(data.materials[i].toString());
  }

  return {
    heightsLiteral: `{${hEntries.join(',')}}`,
    materialsLiteral: `{${mEntries.join(',')}}`,
  };
}
