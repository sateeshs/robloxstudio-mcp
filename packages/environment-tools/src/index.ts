import type { ToolDefinition } from './types.js';

export { prepareBuildTerrain } from './tools/buildTerrain.js';
export { prepareClearEnvironment } from './tools/clearEnvironment.js';
export { prepareSetMood } from './tools/setMood.js';
export { prepareScatterObjects } from './tools/scatterObjects.js';
export { prepareBuildStructure } from './tools/buildStructure.js';
export { prepareSnapshotScene } from './tools/snapshotScene.js';
export { validateTerrainSpec, TerrainSpecSchema } from './schema/terrainSpec.js';
export { validateMoodSpec, MoodSpecSchema } from './schema/moodSpec.js';
export { validateScatterSpec, ScatterSpecSchema } from './schema/scatterSpec.js';
export { validateStructureSpec, StructureSpecSchema } from './schema/structureSpec.js';
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
      'Available biomes: flat, forest, desert, snow, island, plains, mountains.',
      '',
      'Examples:',
      '  {"biome": "flat", "size": {"x": 512, "z": 512}}',
      '  {"biome": "forest", "size": {"x": 1024, "z": 1024}, "heightVariation": "hilly", "water": true}',
      '  {"biome": "desert", "size": {"x": 256, "z": 256}, "seed": 42}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['biome'],
      properties: {
        biome: {
          type: 'string',
          enum: ['flat', 'forest', 'desert', 'snow', 'island', 'plains', 'mountains'],
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
    name: 'set_mood',
    category: 'write',
    description: [
      'Apply a lighting/atmosphere mood preset to the scene.',
      'Changes Lighting properties, Atmosphere, and fog settings in one operation.',
      '',
      'Available presets: morning, noon, sunset, night, spooky, underwater, alien.',
      '',
      'Examples:',
      '  {"preset": "sunset"}',
      '  {"preset": "night", "fogDensity": 0.8}',
      '  {"preset": "morning", "overrides": {"clockTime": 6.5, "brightness": 2}}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['preset'],
      properties: {
        preset: {
          type: 'string',
          enum: ['morning', 'noon', 'sunset', 'night', 'spooky', 'underwater', 'alien'],
          description: 'Mood preset to apply',
        },
        fogDensity: {
          type: 'number',
          description: 'Fog density 0-1 (0 = clear, 1 = thick fog)',
        },
        overrides: {
          type: 'object',
          description: 'Optional property overrides',
          properties: {
            clockTime: { type: 'number', description: 'Clock time 0-24' },
            brightness: { type: 'number', description: 'Brightness 0-10' },
            ambientHex: { type: 'string', description: 'Ambient color as hex (#RRGGBB)' },
          },
        },
      },
    },
  },
  {
    name: 'scatter_objects',
    category: 'write',
    description: [
      'Scatter objects across an area with deterministic placement.',
      'Positions are computed server-side with seeded PRNG, then placed in one batch.',
      'Objects can align to terrain surface or a fixed Y level.',
      '',
      'Built-in templates: tree_pine, tree_oak, rock, bush, cactus, snowman, crystal.',
      'Can also scatter existing instances by path.',
      '',
      'Examples:',
      '  {"source": {"kind": "template", "name": "tree_pine"}, "count": 50, "area": {"origin": {"x": 0, "y": 0, "z": 0}, "size": {"x": 256, "z": 256}}}',
      '  {"source": {"kind": "template", "name": "rock"}, "count": 20, "area": {"origin": {"x": 0, "y": 0, "z": 0}, "size": {"x": 128, "z": 128}}, "scaleRange": [0.5, 2], "seed": 42}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['source', 'count', 'area'],
      properties: {
        source: {
          type: 'object',
          description: 'Object source: template name, instance path, or asset ID',
          properties: {
            kind: { type: 'string', enum: ['template', 'instancePath', 'assetId'] },
            name: { type: 'string', description: 'Template name (for kind=template)' },
            path: { type: 'string', description: 'Instance path (for kind=instancePath)' },
            id: { type: 'number', description: 'Asset ID (for kind=assetId)' },
          },
          required: ['kind'],
        },
        count: {
          type: 'number',
          description: 'Number of objects to place (clamped 1-500)',
        },
        area: {
          type: 'object',
          description: 'Scatter area with origin and size',
          properties: {
            origin: {
              type: 'object',
              properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
            },
            size: {
              type: 'object',
              properties: { x: { type: 'number' }, z: { type: 'number' } },
            },
          },
        },
        align: {
          type: 'string',
          enum: ['terrain', 'yLevel'],
          description: 'Align to terrain surface or fixed Y (default: terrain)',
        },
        randomRotation: {
          type: 'boolean',
          description: 'Randomly rotate objects (default: true)',
        },
        scaleRange: {
          type: 'array',
          items: { type: 'number' },
          description: 'Scale range [min, max] clamped 0.25-4',
        },
        minSpacing: {
          type: 'number',
          description: 'Minimum spacing between objects in studs (default: 4)',
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility',
        },
      },
    },
  },
  {
    name: 'build_structure',
    category: 'write',
    description: [
      'Build a procedural structure at a position.',
      'Creates parameterized part-built structures (not stored models).',
      '',
      'Available templates: house, tower (more coming: bridge, wall, campfire, dock).',
      'Available materials: wood, stone, brick, ice, neon.',
      '',
      'Examples:',
      '  {"template": "house", "position": {"x": 50, "y": 0, "z": 50}}',
      '  {"template": "tower", "position": {"x": 0, "y": 0, "z": 0}, "scale": 1.5, "material": "stone"}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['template', 'position'],
      properties: {
        template: {
          type: 'string',
          enum: ['house', 'tower', 'bridge', 'wall', 'campfire', 'dock'],
          description: 'Structure template to build',
        },
        position: {
          type: 'object',
          description: 'World position to place the structure',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          required: ['x', 'y', 'z'],
        },
        scale: {
          type: 'number',
          description: 'Scale multiplier (clamped 0.5-3, default: 1)',
        },
        material: {
          type: 'string',
          enum: ['wood', 'stone', 'brick', 'ice', 'neon'],
          description: 'Building material (default: wood)',
        },
        seed: {
          type: 'number',
          description: 'Random seed for procedural variation',
        },
      },
    },
  },
  {
    name: 'snapshot_scene',
    category: 'read',
    description: [
      'Capture a snapshot of the current scene state.',
      'Returns EnvTools instance counts by category, terrain bounds, lighting summary,',
      'and workspace statistics. Useful for verifying tool results and planning next steps.',
      '',
      'Example: {} (no parameters needed)',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {},
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
