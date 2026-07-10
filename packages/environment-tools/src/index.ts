import type { ToolDefinition } from './types.js';
import { prepareBuildTerrain } from './tools/buildTerrain.js';
import { prepareClearEnvironment } from './tools/clearEnvironment.js';

export { prepareBuildTerrain } from './tools/buildTerrain.js';
export { prepareClearEnvironment } from './tools/clearEnvironment.js';
export { validateTerrainSpec, TerrainSpecSchema } from './schema/terrainSpec.js';
export { ClearSpecSchema } from './schema/clearSpec.js';
export { renderTemplate, renderTemplateString, sanitizeString, formatValue, setTemplatesDir } from './luau/render.js';

export const ENV_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'build_terrain',
    category: 'write',
    description: [
      'Build terrain in Roblox Studio using a biome template.',
      'Creates terrain with the specified biome, size, and height variation in one operation.',
      '',
      'Available biomes: flat, forest (more coming in future updates).',
      '',
      'Examples:',
      '  {"biome": "flat", "size": {"x": 512, "z": 512}}',
      '  {"biome": "forest", "size": {"x": 1024, "z": 1024}, "heightVariation": "hilly", "water": true}',
      '  {"biome": "forest", "size": {"x": 256, "z": 256}, "seed": 42}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['biome'],
      properties: {
        biome: {
          type: 'string',
          enum: ['flat', 'forest'],
          description: 'Terrain biome type',
        },
        size: {
          type: 'object',
          description: 'Terrain size in studs (each axis clamped 64-2048, default 512)',
          properties: {
            x: { type: 'number' },
            z: { type: 'number' },
          },
        },
        heightVariation: {
          type: 'string',
          enum: ['flat', 'gentle', 'hilly', 'mountainous'],
          description: 'Height variation level (default: gentle)',
        },
        water: {
          type: 'boolean',
          description: 'Add water at base level (default: false)',
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility',
        },
        origin: {
          type: 'object',
          description: 'World position origin (default: {x:0, y:0, z:0})',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
        },
      },
    },
  },
  {
    name: 'clear_environment',
    category: 'write',
    description: [
      'Remove all environment objects created by environment tools.',
      'Only deletes instances tagged with "EnvTools" and clears terrain in their regions.',
      'Does NOT touch any user-created content.',
      '',
      'Example: {"confirm": true}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['confirm'],
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm clearing',
        },
      },
    },
  },
];

export type { ToolDefinition } from './types.js';
