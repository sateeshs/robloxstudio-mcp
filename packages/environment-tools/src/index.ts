import type { ToolDefinition } from './types.js';

export { prepareBuildTerrain } from './tools/buildTerrain.js';
export { prepareClearEnvironment } from './tools/clearEnvironment.js';
export { prepareSetMood } from './tools/setMood.js';
export { prepareScatterObjects } from './tools/scatterObjects.js';
export { prepareBuildStructure } from './tools/buildStructure.js';
export { prepareSnapshotScene } from './tools/snapshotScene.js';
export { prepareGenerateAsset } from './tools/generateAsset.js';
export { prepareComposeScene, executeComposeScene } from './tools/composeScene.js';
export { prepareSculptTerrain } from './tools/sculptTerrain.js';
export { validateTerrainSpec, TerrainSpecSchema } from './schema/terrainSpec.js';
export { validateMoodSpec, MoodSpecSchema } from './schema/moodSpec.js';
export { validateScatterSpec, ScatterSpecSchema } from './schema/scatterSpec.js';
export { validateStructureSpec, StructureSpecSchema } from './schema/structureSpec.js';
export { validateAssetSpec, AssetSpecSchema } from './schema/assetSpec.js';
export { validateSceneSpec, SceneSpecSchema } from './schema/sceneSpec.js';
export { validateSculptSpec, SculptSpecSchema } from './schema/sculptSpec.js';
export { validateWaterSpec, WaterSpecSchema } from './schema/waterSpec.js';
export { validateMaterialColorSpec, MaterialColorSpecSchema } from './schema/materialColorSpec.js';
export { prepareConfigureWater } from './tools/configureWater.js';
export { prepareSetMaterialColors } from './tools/setMaterialColors.js';
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
      'Available biomes: flat, forest, desert, snow, island, plains, mountains, swamp, volcanic, jungle, savanna, mesa.',
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
          enum: ['flat', 'forest', 'desert', 'snow', 'island', 'plains', 'mountains', 'swamp', 'volcanic', 'jungle', 'savanna', 'mesa'],
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
    name: 'generate_asset',
    category: 'write',
    description: [
      'Generate a 3D model using Roblox GenerationService (Cube 3D, beta).',
      'Creates a mesh/model from a text prompt and places it in the scene.',
      '',
      'Requires: Editable Mesh/Image APIs enabled in Game Settings,',
      'DynamicGeneration capability, and the place may need to be published.',
      'Rate limit: 10 generations/min.',
      '',
      'Predefined schemas: Body1 (single mesh, default), Car5 (5-part vehicle).',
      '',
      'Examples:',
      '  {"prompt": "a small wizard tower"}',
      '  {"prompt": "red sports car", "predefinedSchema": "Car5", "position": {"x": 0, "y": 5, "z": 0}}',
      '  {"prompt": "mossy rock", "boundingBox": {"x": 4, "y": 3, "z": 4}, "anchorToTerrain": true}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description of the 3D model to generate (max 200 chars)',
        },
        predefinedSchema: {
          type: 'string',
          enum: ['Body1', 'Car5'],
          description: 'Generation schema: Body1 (single mesh) or Car5 (vehicle, default: Body1)',
        },
        boundingBox: {
          type: 'object',
          description: 'Target bounding box size in studs',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
        },
        position: {
          type: 'object',
          description: 'World position to place the model (default: origin)',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
        },
        anchorToTerrain: {
          type: 'boolean',
          description: 'Raycast down to terrain surface for placement (default: false)',
        },
        name: {
          type: 'string',
          description: 'Name for the generated model instance',
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
  {
    name: 'compose_scene',
    category: 'write',
    description: [
      'Build a complete scene from a single SceneSpec — sequences terrain, mood,',
      'structures, scatters, and assets in the correct order.',
      'Each step runs independently; partial failures are reported per-step.',
      '',
      'Order: terrain → mood → structures → scatters → assets.',
      'Use this instead of calling individual tools when you want a full scene.',
      '',
      'Examples:',
      '  {"terrain": {"biome": "forest", "size": {"x": 512, "z": 512}, "water": true}, "mood": {"preset": "sunset"}}',
      '  {"terrain": {"biome": "snow"}, "mood": {"preset": "night"}, "structures": [{"template": "tower", "position": {"x": 0, "y": 0, "z": 0}, "material": "ice"}], "scatters": [{"source": {"kind": "template", "name": "snowman"}, "count": 10, "area": {"origin": {"x": 0, "y": 0, "z": 0}, "size": {"x": 200, "z": 200}}}]}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        terrain: {
          type: 'object',
          description: 'Terrain specification (see build_terrain)',
          properties: {
            biome: { type: 'string', enum: ['flat', 'forest', 'desert', 'snow', 'island', 'plains', 'mountains', 'swamp', 'volcanic', 'jungle', 'savanna', 'mesa'] },
            size: { type: 'object', properties: { x: { type: 'number' }, z: { type: 'number' } } },
            heightVariation: { type: 'string', enum: ['flat', 'gentle', 'hilly', 'mountainous'] },
            water: { type: 'boolean' },
            seed: { type: 'number' },
            origin: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
          },
        },
        mood: {
          type: 'object',
          description: 'Mood/lighting specification (see set_mood)',
          properties: {
            preset: { type: 'string', enum: ['morning', 'noon', 'sunset', 'night', 'spooky', 'underwater', 'alien'] },
            fogDensity: { type: 'number' },
            overrides: { type: 'object' },
          },
        },
        structures: {
          type: 'array',
          description: 'Array of structure specs (max 20, see build_structure)',
          items: { type: 'object' },
        },
        scatters: {
          type: 'array',
          description: 'Array of scatter specs (max 10, see scatter_objects)',
          items: { type: 'object' },
        },
        assets: {
          type: 'array',
          description: 'Array of asset generation specs (max 5, see generate_asset)',
          items: { type: 'object' },
        },
      },
    },
  },
  {
    name: 'sculpt_terrain',
    category: 'write',
    description: [
      'Sculpt terrain with voxel-level precision.',
      'Supports fill, subtract, smooth, replace_material, and paint operations.',
      'Shapes: block, ball, cylinder, wedge.',
      '',
      'Operations:',
      '  fill — add terrain with a material',
      '  subtract — carve/remove terrain (caves, tunnels)',
      '  smooth — average occupancy for smoother surfaces',
      '  replace_material — swap one material for another in a region',
      '  paint — change surface material without altering shape',
      '',
      'Examples:',
      '  {"operation": "fill", "shape": "ball", "position": {"x": 0, "y": 10, "z": 0}, "size": {"x": 40, "y": 40, "z": 40}, "material": "Rock"}',
      '  {"operation": "subtract", "shape": "cylinder", "position": {"x": 0, "y": 0, "z": 0}, "size": {"x": 10, "y": 30, "z": 10}}',
      '  {"operation": "smooth", "position": {"x": 0, "y": 5, "z": 0}, "size": {"x": 64, "y": 32, "z": 64}, "strength": 0.8}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['operation', 'position', 'size'],
      properties: {
        operation: {
          type: 'string',
          enum: ['fill', 'subtract', 'smooth', 'replace_material', 'paint'],
          description: 'Sculpt operation to perform',
        },
        shape: {
          type: 'string',
          enum: ['block', 'ball', 'cylinder', 'wedge'],
          description: 'Shape of the sculpt region (default: ball)',
        },
        position: {
          type: 'object',
          description: 'Center position of the sculpt operation',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          required: ['x', 'y', 'z'],
        },
        size: {
          type: 'object',
          description: 'Size of the sculpt region in studs (clamped 4-512)',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          required: ['x', 'y', 'z'],
        },
        material: {
          type: 'string',
          description: 'Target material for fill/paint/replace operations',
        },
        sourceMaterial: {
          type: 'string',
          description: 'Source material for replace_material operation',
        },
        strength: {
          type: 'number',
          description: 'Smoothing strength 0-1 (default: 0.5, for smooth operation)',
        },
      },
    },
  },
  {
    name: 'configure_water',
    category: 'write',
    description: [
      'Configure terrain water properties (color, transparency, reflectance, waves).',
      'Modifies the Terrain instance water settings in one operation.',
      '',
      'Examples:',
      '  {"color": "#1E90FF", "transparency": 0.5}',
      '  {"waveSize": 0.3, "waveSpeed": 20}',
      '  {"color": "#00CED1", "transparency": 0.2, "reflectance": 0.8, "waveSize": 0.1, "waveSpeed": 5}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'Water color as hex #RRGGBB (optional, keeps current if omitted)',
        },
        transparency: {
          type: 'number',
          description: 'Water transparency 0-1 (default: 0.3)',
        },
        reflectance: {
          type: 'number',
          description: 'Water reflectance 0-1 (default: 1)',
        },
        waveSize: {
          type: 'number',
          description: 'Wave size 0-1 (default: 0.15)',
        },
        waveSpeed: {
          type: 'number',
          description: 'Wave speed 0-100 (default: 10)',
        },
      },
    },
  },
  {
    name: 'set_material_colors',
    category: 'write',
    description: [
      'Override terrain material colors for custom palettes.',
      'Changes the display color of terrain materials without affecting geometry.',
      '',
      'Available materials: Grass, Sand, Rock, Snow, Ice, Mud, Ground, Sandstone,',
      'Slate, LeafyGrass, Basalt, CrackedLava, Limestone, Salt, WoodPlanks,',
      'Concrete, Brick, Cobblestone, Asphalt, Glacier, Pavement, SmoothPlastic.',
      '',
      'Examples:',
      '  {"colors": {"Grass": "#2E8B57", "Rock": "#696969"}}',
      '  {"colors": {"Sand": "#F4A460", "Sandstone": "#DAA520", "Ground": "#8B4513"}}',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      required: ['colors'],
      properties: {
        colors: {
          type: 'object',
          description: 'Map of material name to hex color #RRGGBB',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
];

export type { ToolDefinition } from './types.js';
