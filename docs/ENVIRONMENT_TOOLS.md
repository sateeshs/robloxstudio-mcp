# Environment Tools — User Guide

Environment tools let you build complete Roblox worlds from natural-language
prompts. An AI client (Claude Code, Claude Desktop, Cursor) translates your
request into structured tool calls that create terrain, set lighting, scatter
objects, build structures, generate 3D assets, and add visual effects.

## Quick Start

1. Start the MCP server: `npm start` (or `npm run dev` for development)
2. Open Roblox Studio with the dev plugin installed (`npm run plugin:install`)
3. Connect your AI client to the MCP server
4. Describe what you want to build!

## Kid Mode

For a safe, kid-friendly experience that only exposes environment tools and
read-only inspection tools (no script editing or raw code execution):

```bash
# Via command line flag
npm start -- --profile kid

# Via environment variable
MCP_PROFILE=kid npm start
```

Kid mode loads the allowlist from `config/kid-mode.json`.

## Available Tools

| Tool | Purpose |
|------|---------|
| `build_terrain` | Create terrain with 12 biome templates |
| `sculpt_terrain` | Voxel-level terrain editing (fill, subtract, smooth, paint) |
| `set_mood` | Apply lighting/atmosphere presets |
| `scatter_objects` | Scatter trees, rocks, bushes across an area |
| `build_structure` | Build procedural houses, towers |
| `generate_asset` | Generate 3D models via AI (animals, vehicles, objects) |
| `add_effect` | Add fire, smoke, rain, lights, sounds, explosions |
| `configure_water` | Customize water color, waves, transparency |
| `set_material_colors` | Override terrain material colors |
| `compose_scene` | Build a complete scene in one call |
| `snapshot_scene` | Inspect the current scene state |
| `clear_environment` | Remove all environment tool objects |

## Biomes (12 total)

| Biome | Character |
|-------|-----------|
| `flat` | Perfectly flat single-material slab |
| `forest` | Grass + rock, noise-based hills |
| `desert` | Sand + sandstone, dune-like noise |
| `snow` | Snow + ice + rock, rolling hills |
| `island` | Sand beach + grass center, radial falloff |
| `plains` | Grass + ground, gentle rolling |
| `mountains` | Altitude-banded: grass → rock → snow |
| `swamp` | Low/flat, mud + pools, always water |
| `volcanic` | Caldera ring shape, basalt + lava |
| `jungle` | Dense leafy grass + mud, 4-octave noise |
| `savanna` | Gentle grass + ground |
| `mesa` | Stepped plateaus, sandstone layers |

## Effects

| Effect | Type | Description |
|--------|------|-------------|
| `fire` | Particle + Light | Orange flames with warm point light |
| `smoke` | Particle | Rising gray smoke plume |
| `sparkles` | Particle | Glittering light particles |
| `rain` | Particle | Falling raindrops over an area |
| `snow` | Particle | Drifting snowflakes over an area |
| `magic` | Particle + Light | Purple/pink/cyan swirling particles |
| `dust` | Particle | Floating dust motes |
| `embers` | Particle | Rising glowing sparks |
| `torch_light` | Light | Warm orange point light with shadows |
| `spotlight` | Light | Directional cone light |
| `neon_glow` | Light + Part | Glowing neon block |
| `campfire_light` | Particle + Light | Fire + embers + warm flickering light |
| `explosion` | Physics | Blast with radius and pressure |
| `ambient_fire` | Sound | Crackling fire loop |
| `ambient_wind` | Sound | Wind howling loop |
| `ambient_water` | Sound | Running water loop |
| `ambient_rain` | Sound | Rain loop |
| `ambient_birds` | Sound | Birdsong loop |
| `ambient_cave` | Sound | Cave drips loop |
| `ambient_music` | Sound | Background music loop |

## Mood Presets

| Preset | Time | Character |
|--------|------|-----------|
| `morning` | 7:00 | Warm, soft light |
| `noon` | 12:00 | Bright, clear sky |
| `sunset` | 18:00 | Orange glow, warm atmosphere |
| `night` | 0:00 | Dark, blue ambient |
| `spooky` | 21:00 | Purple fog, dense atmosphere |
| `underwater` | 12:00 | Blue-green, very dense fog |
| `alien` | 15:00 | Green tint, otherworldly |

---

## Sample Game Prompts

### 1. Campfire Adventure Game

> Build a forest with gentle hills and water. Place a stone house near
> the center. Add campfire effects with fire, embers, and crackling sound
> at position (50, 1, 50). Scatter pine trees and rocks around the area.
> Set the mood to sunset. Add ambient bird sounds in the trees.

Tools: `build_terrain`(forest, water=true) → `set_mood`(sunset) →
`build_structure`(house, stone) → `scatter_objects`(tree_pine, rock) →
`add_effect`(campfire_light) → `add_effect`(ambient_fire) →
`add_effect`(ambient_birds)

### 2. Volcanic Survival Island

> Create a volcanic island surrounded by ocean. Set the mood to spooky.
> Add fire and smoke effects at the volcano summit. Place glowing neon
> crystals around the caldera. Add ambient wind sounds. Generate a dragon
> statue near the lava.

Tools: `build_terrain`(volcanic, water=true) → `set_mood`(spooky) →
`add_effect`(fire, smoke, embers at summit) →
`add_effect`(neon_glow, color=#FF3300) → `add_effect`(ambient_wind) →
`generate_asset`(prompt="dragon statue")

### 3. Enchanted Snow Village

> Build a snowy mountainous landscape. Make it nighttime. Place two
> ice houses and a tower. Scatter snowmen and pine trees. Add falling snow
> effects over the whole area. Place torch lights along a path. Add
> sparkle effects on the tower.

Tools: `build_terrain`(snow, mountainous) → `set_mood`(night) →
`build_structure`(house x2, tower, material=ice) →
`scatter_objects`(snowman, tree_pine) → `add_effect`(snow, radius=100) →
`add_effect`(torch_light x5 along path) → `add_effect`(sparkles on tower)

### 4. Jungle Temple Explorer

> Create a dense jungle terrain with hilly variation. Set morning mood.
> Build a stone tower in the center as a temple. Scatter bushes and oak
> trees. Add magic particle effects around the temple entrance. Add
> ambient bird sounds and water sounds near the river. Generate a treasure
> chest with AI.

Tools: `build_terrain`(jungle, hilly, water=true) → `set_mood`(morning) →
`build_structure`(tower, stone) → `scatter_objects`(bush, tree_oak) →
`add_effect`(magic, color=#00FF88) → `add_effect`(ambient_birds) →
`add_effect`(ambient_water) → `generate_asset`(prompt="treasure chest")

### 5. Alien Crystal Cave

> Make a flat terrain and set alien mood. Scatter crystals everywhere.
> Add magic effects with purple glow. Place neon glow lights around the
> cave. Add ambient cave sounds. Generate a mysterious alien artifact
> in the center.

Tools: `build_terrain`(flat) → `set_mood`(alien) →
`scatter_objects`(crystal, count=80) →
`add_effect`(magic, color=#8800FF) → `add_effect`(neon_glow, color=#00FF88) →
`add_effect`(ambient_cave) →
`generate_asset`(prompt="alien crystal artifact")

### 6. Racing Game Arena

> Build a flat desert terrain 1024x1024. Set noon lighting. Generate
> a red sports car and a blue sports car using AI. Place spotlights around
> the track. Add dust effects near the starting line. Build a tower as
> a viewing platform.

Tools: `build_terrain`(desert, flat, size=1024) → `set_mood`(noon) →
`generate_asset`(prompt="red sports car", predefinedSchema=Car5) →
`generate_asset`(prompt="blue sports car", predefinedSchema=Car5) →
`add_effect`(spotlight x4) → `add_effect`(dust) →
`build_structure`(tower)

### 7. Haunted Swamp

> Create a swamp terrain with water. Set spooky mood with heavy fog.
> Add fire effects on floating torches. Scatter rocks and bushes. Add
> green smoke effects rising from the water. Place ambient wind sounds.
> Generate a creepy scarecrow.

Tools: `build_terrain`(swamp) → `set_mood`(spooky, fogDensity=0.9) →
`add_effect`(fire, torch_light at multiple spots) →
`scatter_objects`(rock, bush) → `add_effect`(smoke, color=#44AA44) →
`add_effect`(ambient_wind) → `generate_asset`(prompt="creepy scarecrow")

### 8. Underwater Kingdom

> Build an island terrain with water. Set underwater mood. Make the
> water deep blue with high transparency. Add sparkle effects underwater.
> Generate a mermaid statue and a sunken ship. Add ambient water sounds.

Tools: `build_terrain`(island) → `set_mood`(underwater) →
`configure_water`(color=#0044AA, transparency=0.6) →
`add_effect`(sparkles, color=#00CCFF) →
`generate_asset`(prompt="mermaid statue") →
`generate_asset`(prompt="sunken pirate ship") →
`add_effect`(ambient_water)

### 9. Medieval Battle Scene

> Create mountainous terrain. Set sunset mood. Build two stone towers
> facing each other. Place fire effects on the towers. Scatter rocks
> between them. Add explosion effects in the battlefield. Generate
> knight armor and a dragon. Add ambient fire and wind sounds.

Tools: `build_terrain`(mountains) → `set_mood`(sunset) →
`build_structure`(tower x2, stone) → `add_effect`(fire on towers) →
`scatter_objects`(rock) → `add_effect`(explosion) →
`generate_asset`(prompt="knight in armor") →
`generate_asset`(prompt="flying dragon", customSchema={groups:["body","wings","tail"]}) →
`add_effect`(ambient_fire, ambient_wind)

### 10. Mesa Desert Outpost

> Build mesa terrain with stepped plateaus. Set noon mood. Change
> sand color to warm orange and sandstone to deep red. Build a house
> on the plateau. Scatter cactus plants. Add dust effects and a
> spotlight. Generate a desert eagle with AI.

Tools: `build_terrain`(mesa) → `set_mood`(noon) →
`set_material_colors`({Sand:#E8A040, Sandstone:#CC3300}) →
`build_structure`(house) → `scatter_objects`(cactus) →
`add_effect`(dust) → `add_effect`(spotlight) →
`generate_asset`(prompt="desert eagle bird")

### 11. Complete Scene (One Command)

> Use compose_scene to build everything at once: savanna terrain with
> gentle hills, morning mood, a wooden house, scattered trees and rocks,
> and a generated giraffe.

Tools: `compose_scene` with full SceneSpec:
```json
{
  "terrain": {"biome": "savanna", "size": {"x": 512, "z": 512}, "heightVariation": "gentle"},
  "mood": {"preset": "morning"},
  "structures": [{"template": "house", "position": {"x": 50, "y": 0, "z": 50}, "material": "wood"}],
  "scatters": [
    {"source": {"kind": "template", "name": "tree_oak"}, "count": 40, "area": {"origin": {"x": 0, "y": 0, "z": 0}, "size": {"x": 400, "z": 400}}},
    {"source": {"kind": "template", "name": "rock"}, "count": 20, "area": {"origin": {"x": 0, "y": 0, "z": 0}, "size": {"x": 400, "z": 400}}}
  ],
  "assets": [{"prompt": "giraffe", "position": {"x": 80, "y": 0, "z": 80}, "anchorToTerrain": true}]
}
```

### 12. Rainy City Night

> Build a flat terrain. Set night mood. Add rain over a large area.
> Add ambient rain sounds. Place spotlights like street lamps. Build
> structures for buildings. Add neon glow signs. Generate a taxi cab.
> Configure water to be dark and reflective.

Tools: `build_terrain`(flat, size=1024) → `set_mood`(night) →
`add_effect`(rain, radius=100) → `add_effect`(ambient_rain) →
`add_effect`(spotlight x6 at intervals) →
`add_effect`(neon_glow, color=#FF0066) →
`build_structure`(house x3) →
`generate_asset`(prompt="yellow taxi cab", predefinedSchema=Car5) →
`configure_water`(color=#001133, reflectance=1, transparency=0.1)

---

## 3D Asset Generation Tips

The `generate_asset` tool uses Roblox GenerationService (Cube 3D) to create
3D models from text descriptions. Tips for good results:

- **Be specific**: "red sports car" works better than "car"
- **Use predefinedSchema**: `Car5` for vehicles (5-part: chassis, wheels, etc.)
- **Use customSchema**: For multi-part creatures, e.g. `{"groups": ["body", "legs", "head", "tail"]}`
- **Image reference**: Pass `imageAssetId` for image-guided generation
- **Scale after**: Use `scale` to resize (0.1 to 10x)
- **Animals & creatures**: Generated via AI, not built-in templates
- **Vehicles**: Use `Car5` schema for proper wheel/body separation
- **Anchor to terrain**: Set `anchorToTerrain: true` to place on ground

## Safety & Undo

- **CollectionService tagging**: Every object created by environment tools is
  tagged with "EnvTools". `clear_environment` only removes tagged objects —
  your own content is never touched.
- **ChangeHistoryService**: Every tool call is wrapped in a recording. Press
  Ctrl+Z in Studio to undo any single tool call.
- **Input clamping**: Out-of-range values are clamped, never rejected. The tool
  result includes warnings when clamping occurred.

## Telemetry

Tool calls are logged to `logs/scenes.jsonl` (not committed to git). Each line
is a JSON object with timestamp, tool name, input spec, success/failure,
duration, and operation ID. This data can seed future fine-tuning.
