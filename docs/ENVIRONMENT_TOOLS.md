# Environment Tools — User Guide

Environment tools let you build complete Roblox worlds from natural-language
prompts. An AI client (Claude Code, Claude Desktop, Cursor) translates your
request into structured tool calls that create terrain, set lighting, scatter
objects, build structures, and generate 3D assets.

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
| `build_terrain` | Create terrain with biome templates |
| `set_mood` | Apply lighting/atmosphere presets |
| `scatter_objects` | Scatter objects across an area |
| `build_structure` | Build procedural structures |
| `generate_asset` | Generate 3D models via AI (beta) |
| `snapshot_scene` | Inspect the current scene state |
| `clear_environment` | Remove all environment tool objects |

## 10 Example Prompts

### 1. A Simple Forest

> Build a 512×512 forest terrain with gentle hills and water.

Tools used: `build_terrain` with biome=forest, water=true

### 2. Spooky Night Scene

> Make a spooky forest at night with lots of fog.

Tools used: `build_terrain` (forest), `set_mood` (spooky, fogDensity=0.9)

### 3. Desert Oasis

> Create a desert with sand dunes and an oasis in the middle.

Tools used: `build_terrain` (desert, water=true)

### 4. Snowy Village

> Build a snowy landscape with a house and scatter some snowmen around it.

Tools used: `build_terrain` (snow), `build_structure` (house, material=ice),
`scatter_objects` (snowman, count=10)

### 5. Mountain Lake

> Create mountainous terrain with a lake and scatter some pine trees.

Tools used: `build_terrain` (mountains, water=true),
`scatter_objects` (tree_pine, count=100)

### 6. Island Paradise

> Build a tropical island surrounded by water with oak trees and rocks.

Tools used: `build_terrain` (island),
`scatter_objects` (tree_oak, count=30),
`scatter_objects` (rock, count=20)

### 7. Crystal Cave

> Make a flat terrain, set the mood to alien, and scatter crystals everywhere.

Tools used: `build_terrain` (flat), `set_mood` (alien),
`scatter_objects` (crystal, count=50)

### 8. Medieval Tower

> Build a stone tower on a grassy hill.

Tools used: `build_terrain` (plains, heightVariation=hilly),
`build_structure` (tower, material=stone)

### 9. Sunset Beach

> Create an island at sunset with bushes scattered along the shore.

Tools used: `build_terrain` (island), `set_mood` (sunset),
`scatter_objects` (bush, count=40)

### 10. Wizard's Domain

> Build a mountainous terrain at night with a brick tower and generate a
> magical wizard statue using AI.

Tools used: `build_terrain` (mountains), `set_mood` (night),
`build_structure` (tower, material=brick),
`generate_asset` (prompt="small wizard statue")

## Biomes

| Biome | Materials | Character |
|-------|-----------|-----------|
| `flat` | Single material slab | Perfectly flat |
| `forest` | Grass + rock | Noise-based hills with optional water |
| `desert` | Sand + sandstone | Dune-like double-octave noise |
| `snow` | Snow + ice + rock | Rolling hills with ice patches |
| `island` | Sand (beach) + grass (center) | Radial falloff with surrounding water |
| `plains` | Grass + ground | Gentle low-frequency rolling |
| `mountains` | Grass → rock → snow by altitude | Multi-octave steep peaks |

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
