/**
 * Biome configurations for server-side heightmap generation.
 * Each biome defines noise parameters, material rules, and height transforms.
 */

import { MATERIAL } from './heightmap.js';
import type { BiomeConfig } from './heightmap.js';

/** Height variation multipliers */
const HEIGHT_MULT: Record<string, number> = {
  flat: 0.15,
  gentle: 0.5,
  hilly: 1.0,
  mountainous: 1.5,
};

/** Get height multiplier for a variation string */
function heightMult(variation: string): number {
  return HEIGHT_MULT[variation] ?? 0.5;
}

export function createBiomeConfig(
  biome: string,
  seed: number,
  heightVariation: string,
  addWater: boolean,
): BiomeConfig {
  const hm = heightMult(heightVariation);

  switch (biome) {
    case 'forest':
      return {
        noiseConfig: {
          seed,
          octaves: 3,
          persistence: 0.5,
          lacunarity: 2.0,
          scale: 0.008,
        },
        maxHeight: 30 * hm,
        baseHeight: 4,
        materialRules: [
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.Rock, minSlope: 0.3 },
          { minAltitude: 0.6, maxAltitude: 1.0, material: MATERIAL.Rock },
          { minAltitude: 0.0, maxAltitude: 0.15, material: MATERIAL.Ground },
          { minAltitude: 0.15, maxAltitude: 0.6, material: MATERIAL.Grass },
        ],
        defaultMaterial: MATERIAL.Grass,
        subsurfaceMaterial: MATERIAL.Rock,
        waterLevel: addWater ? 2 : 0,
      };

    case 'desert':
      return {
        noiseConfig: {
          seed,
          octaves: 2,
          persistence: 0.4,
          lacunarity: 2.2,
          scale: 0.006,
        },
        maxHeight: 20 * hm,
        baseHeight: 2,
        materialRules: [
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.Sandstone },
          { minAltitude: 0.0, maxAltitude: 0.1, material: MATERIAL.Sandstone },
          { minAltitude: 0.1, maxAltitude: 0.7, material: MATERIAL.Sand },
        ],
        defaultMaterial: MATERIAL.Sand,
        subsurfaceMaterial: MATERIAL.Sandstone,
        waterLevel: addWater ? 1 : 0,
      };

    case 'snow':
      return {
        noiseConfig: {
          seed,
          octaves: 3,
          persistence: 0.45,
          lacunarity: 2.0,
          scale: 0.007,
        },
        maxHeight: 25 * hm,
        baseHeight: 3,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.2, material: MATERIAL.Ice },
          { minAltitude: 0.6, maxAltitude: 1.0, material: MATERIAL.Rock, minSlope: 0.4 },
          { minAltitude: 0.2, maxAltitude: 1.0, material: MATERIAL.Snow },
        ],
        defaultMaterial: MATERIAL.Snow,
        subsurfaceMaterial: MATERIAL.Rock,
        waterLevel: addWater ? 2 : 0,
      };

    case 'island':
      return {
        noiseConfig: {
          seed,
          octaves: 3,
          persistence: 0.5,
          lacunarity: 2.0,
          scale: 0.01,
        },
        maxHeight: 30 * hm,
        baseHeight: 0,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.15, material: MATERIAL.Sand },
          { minAltitude: 0.15, maxAltitude: 0.3, material: MATERIAL.Sand },
          { minAltitude: 0.6, maxAltitude: 1.0, material: MATERIAL.Rock, minSlope: 0.3 },
          { minAltitude: 0.3, maxAltitude: 1.0, material: MATERIAL.Grass },
        ],
        defaultMaterial: MATERIAL.Grass,
        subsurfaceMaterial: MATERIAL.Rock,
        // Island always has surrounding water
        waterLevel: 3,
        heightTransform: (rawNoise, nx, nz) => {
          // Radial falloff from center — creates island shape
          const dx = nx - 0.5;
          const dz = nz - 0.5;
          const dist = Math.sqrt(dx * dx + dz * dz) * 2; // 0 at center, ~1 at edges
          const falloff = Math.max(0, 1 - dist * dist);
          return rawNoise * falloff;
        },
      };

    case 'plains':
      return {
        noiseConfig: {
          seed,
          octaves: 2,
          persistence: 0.35,
          lacunarity: 2.0,
          scale: 0.005,
        },
        maxHeight: 10 * hm,
        baseHeight: 2,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.2, material: MATERIAL.Ground },
          { minAltitude: 0.2, maxAltitude: 1.0, material: MATERIAL.Grass },
        ],
        defaultMaterial: MATERIAL.Grass,
        subsurfaceMaterial: MATERIAL.Ground,
        waterLevel: addWater ? 1 : 0,
      };

    case 'mountains':
      return {
        noiseConfig: {
          seed,
          octaves: 5,
          persistence: 0.55,
          lacunarity: 2.1,
          scale: 0.006,
        },
        maxHeight: 80 * hm,
        baseHeight: 5,
        materialRules: [
          { minAltitude: 0.8, maxAltitude: 1.0, material: MATERIAL.Snow },
          { minAltitude: 0.6, maxAltitude: 0.8, material: MATERIAL.Slate, minSlope: 0.3 },
          { minAltitude: 0.4, maxAltitude: 0.8, material: MATERIAL.Rock },
          { minAltitude: 0.2, maxAltitude: 0.4, material: MATERIAL.Grass },
          { minAltitude: 0.0, maxAltitude: 0.2, material: MATERIAL.Ground },
        ],
        defaultMaterial: MATERIAL.Grass,
        subsurfaceMaterial: MATERIAL.Slate,
        waterLevel: addWater ? 4 : 0,
      };

    case 'swamp':
      return {
        noiseConfig: {
          seed,
          octaves: 2,
          persistence: 0.4,
          lacunarity: 2.0,
          scale: 0.012,
        },
        maxHeight: 6 * hm,
        baseHeight: 1,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.3, material: MATERIAL.Mud },
          { minAltitude: 0.3, maxAltitude: 0.6, material: MATERIAL.LeafyGrass },
          { minAltitude: 0.6, maxAltitude: 1.0, material: MATERIAL.Ground },
        ],
        defaultMaterial: MATERIAL.Mud,
        subsurfaceMaterial: MATERIAL.Mud,
        waterLevel: 2,
      };

    case 'volcanic':
      return {
        noiseConfig: {
          seed,
          octaves: 4,
          persistence: 0.6,
          lacunarity: 2.0,
          scale: 0.007,
        },
        maxHeight: 60 * hm,
        baseHeight: 3,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.15, material: MATERIAL.CrackedLava },
          { minAltitude: 0.15, maxAltitude: 0.4, material: MATERIAL.Basalt },
          { minAltitude: 0.4, maxAltitude: 0.7, material: MATERIAL.Rock },
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.Slate },
        ],
        defaultMaterial: MATERIAL.Basalt,
        subsurfaceMaterial: MATERIAL.CrackedLava,
        waterLevel: 0,
        heightTransform: (rawNoise, nx, nz) => {
          const dx = nx - 0.5;
          const dz = nz - 0.5;
          const dist = Math.sqrt(dx * dx + dz * dz) * 2;
          const ring = Math.max(0, 1 - Math.abs(dist - 0.4) * 4);
          const crater = dist < 0.15 ? -0.3 : 0;
          return rawNoise * 0.5 + ring * 0.8 + crater;
        },
      };

    case 'jungle':
      return {
        noiseConfig: {
          seed,
          octaves: 4,
          persistence: 0.55,
          lacunarity: 2.2,
          scale: 0.009,
        },
        maxHeight: 40 * hm,
        baseHeight: 3,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.15, material: MATERIAL.Mud },
          { minAltitude: 0.15, maxAltitude: 0.4, material: MATERIAL.LeafyGrass },
          { minAltitude: 0.4, maxAltitude: 0.7, material: MATERIAL.Grass },
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.Rock, minSlope: 0.3 },
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.LeafyGrass },
        ],
        defaultMaterial: MATERIAL.LeafyGrass,
        subsurfaceMaterial: MATERIAL.Rock,
        waterLevel: addWater ? 2 : 0,
      };

    case 'savanna':
      return {
        noiseConfig: {
          seed,
          octaves: 2,
          persistence: 0.3,
          lacunarity: 2.0,
          scale: 0.004,
        },
        maxHeight: 8 * hm,
        baseHeight: 2,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.3, material: MATERIAL.Ground },
          { minAltitude: 0.3, maxAltitude: 0.7, material: MATERIAL.Grass },
          { minAltitude: 0.7, maxAltitude: 1.0, material: MATERIAL.Rock },
        ],
        defaultMaterial: MATERIAL.Grass,
        subsurfaceMaterial: MATERIAL.Ground,
        waterLevel: addWater ? 1 : 0,
      };

    case 'mesa':
      return {
        noiseConfig: {
          seed,
          octaves: 3,
          persistence: 0.45,
          lacunarity: 2.0,
          scale: 0.005,
        },
        maxHeight: 50 * hm,
        baseHeight: 2,
        materialRules: [
          { minAltitude: 0.0, maxAltitude: 0.2, material: MATERIAL.Sand },
          { minAltitude: 0.2, maxAltitude: 0.4, material: MATERIAL.Sandstone },
          { minAltitude: 0.4, maxAltitude: 0.6, material: MATERIAL.Limestone },
          { minAltitude: 0.6, maxAltitude: 0.8, material: MATERIAL.Sandstone },
          { minAltitude: 0.8, maxAltitude: 1.0, material: MATERIAL.Rock },
        ],
        defaultMaterial: MATERIAL.Sandstone,
        subsurfaceMaterial: MATERIAL.Sandstone,
        waterLevel: 0,
        heightTransform: (rawNoise) => {
          // Quantize to create stepped/terraced mesa plateaus
          const steps = 5;
          const normalized = (rawNoise + 1) / 2;
          const stepped = Math.floor(normalized * steps) / steps;
          return stepped * 2 - 1;
        },
      };

    default:
      throw new Error(`Unknown biome: ${biome}`);
  }
}
