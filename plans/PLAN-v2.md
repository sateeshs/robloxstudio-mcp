# PLAN-v2.md — Enhanced Terrain & 3D Asset Capabilities

> Extends PLAN.md (M0–M4 complete). This plan adds advanced terrain generation,
> voxel-level control, water customization, and richer 3D asset workflows.

## 0. Motivation

The M0–M4 layer uses `FillBlock` per-voxel, which is slow for large terrains
and limits what we can express. Research into the Roblox Terrain API, the
GravyPouch/RobloxTerrainCreator project, and Obby.fun's AI map generator
reveals three key gaps in our current implementation:

1. **Terrain fidelity** — We use `FillBlock` per cell. `WriteVoxels` with
   pre-computed 3D material+occupancy arrays is 10–100× faster and enables
   smooth gradients, partial occupancy, and multi-material columns.
2. **Water & material control** — Roblox exposes 22+ terrain materials, water
   properties (color, wave size, transparency, reflectance), animated grass,
   and per-material color overrides. We expose none of these.
3. **3D generation depth** — `GenerateModelAsync` now supports custom schemas
   (not just Body1/Car5), image-guided generation, `LoadGeneratedMeshAsync`
   for reuse, and `ScaleTo()` for post-generation sizing. We use only the
   basic text prompt path.

### Reference projects studied

| Project | Key takeaway |
|---------|-------------|
| [Roblox Terrain API](https://create.roblox.com/docs/parts/terrain) | 22+ materials, `WriteVoxels` with 3D arrays, `ReadVoxels` for inspection, 4×4×4 voxel grid, heightmap/colormap import (4096×4096 max) |
| [GravyPouch/RobloxTerrainCreator](https://github.com/GravyPouch/RobloxTerrainCreator) | 12 biomes with climate-based generation (temperature+moisture+elevation), 64×64 chunk `WriteVoxels`, bilinear height interpolation, ocean skip optimization, column-aware Y range, buffer-based base64 decode |
| [Obby.fun AI Map Generator](https://www.obby.fun/blog/roblox-map-generator-ai) | Full map from text prompt → `.rbxlx`, graybox-first workflow (AI does layout, human polishes), genre-specific prompt guidance, StreamingEnabled for large worlds |
| [Roblox GenerationService](https://create.roblox.com/docs/reference/engine/classes/GenerationService) | `GenerateModelAsync` with custom `SchemaDefinition` (named part groups), image input via `Content.fromAssetId()`, `LoadGeneratedMeshAsync` for reuse, `ScaleTo()` for sizing |

---

## 1. New & Enhanced Tools

### 1.1 `sculpt_terrain(SculptSpec)` — NEW

Voxel-level terrain editing using `WriteVoxels`. Unlike `build_terrain` (which
fills biome templates), this tool gives fine-grained control:

```ts
interface SculptSpec {
  operation: "fill" | "subtract" | "smooth" | "replace_material" | "paint";
  shape: "block" | "ball" | "cylinder" | "wedge";
  position: Vec3;
  size: Vec3;                  // bounding box for the operation
  material?: TerrainMaterial;  // target material (for fill/paint)
  sourceMaterial?: TerrainMaterial; // for replace_material
  strength?: number;           // 0-1, for smooth operation (default 0.5)
  seed?: number;
}
```

**Implementation:** Uses `FillBlock`/`FillBall`/`FillCylinder`/`FillWedge` for
fill/subtract, `ReadVoxels` + averaging + `WriteVoxels` for smooth, and
`ReplaceMaterial` for material swaps. One template per operation type.

### 1.2 `configure_water(WaterSpec)` — NEW

Controls Roblox's water terrain properties:

```ts
interface WaterSpec {
  color?: string;           // hex (#RRGGBB), default Roblox blue
  transparency?: number;    // 0-1 (default 0.3)
  reflectance?: number;     // 0-1 (default 1)
  waveSize?: number;        // 0-1 (default 0.15)
  waveSpeed?: number;       // 0-100 (default 10)
}
```

**Implementation:** Simple property setter on `workspace.Terrain`. Separate
from `set_mood` because water config is persistent and orthogonal to lighting.

### 1.3 `set_material_colors(MaterialColorSpec)` — NEW

Override default terrain material colors for custom palettes:

```ts
interface MaterialColorSpec {
  colors: Record<TerrainMaterial, string>; // material → hex color
}
// Example: { "Grass": "#2d5a1e", "Sand": "#e8d5a3", "Rock": "#6b6b6b" }
```

**Implementation:** Calls `Terrain:SetMaterialColor(material, Color3)` for
each entry.

### 1.4 Enhanced `build_terrain` — UPGRADE

Add these capabilities to the existing tool:

| Feature | Current | Enhanced |
|---------|---------|----------|
| Fill method | `FillBlock` per cell | `WriteVoxels` with 3D arrays (10-100× faster) |
| Materials per biome | 1-2 hardcoded | Multi-material altitude/slope layering |
| Noise | Single octave `math.noise` | Multi-octave with configurable persistence |
| Water | Binary (fill region at base) | Proper ocean floor + shoreline gradient |
| New biomes | 7 biomes | +5: swamp, volcanic, jungle, savanna, mesa |
| Erosion | None | Optional hydraulic erosion pass (smooth valleys) |
| Occupancy | Always 1.0 (blocky) | Gradient at surface (smooth transitions) |

**New TerrainSpec fields:**

```ts
interface TerrainSpec {
  // ... existing fields ...
  erosion?: boolean;          // apply smoothing pass (default: false)
  materialOverrides?: Record<string, TerrainMaterial>; // e.g. {"surface": "LeafyGrass"}
  waterConfig?: WaterSpec;    // inline water properties
  noiseOctaves?: number;      // 1-6 (default: biome-specific, clamped)
  noisePersistence?: number;  // 0.1-0.9 (default: 0.5)
}
```

**WriteVoxels migration pattern** (from GravyPouch):

```
1. Pre-compute heightmap as flat array (server-side or Luau)
2. Process in 64×64×60 chunks (max WriteVoxels size)
3. For each chunk:
   a. Build 3D material[x][y][z] and occupancy[x][y][z] arrays
   b. Assign materials by altitude + noise (grass → rock → snow)
   c. Set occupancy < 1.0 at surface voxels for smooth edges
   d. Skip all-air chunks entirely
4. Call WriteVoxels per chunk with task.wait() yields
```

### 1.5 Enhanced `generate_asset` — UPGRADE

| Feature | Current | Enhanced |
|---------|---------|----------|
| Schemas | Body1, Car5 | + Custom SchemaDefinition with named Groups |
| Input | Text only | + Image reference via `Content.fromAssetId()` |
| Post-gen | Position + anchor | + `ScaleTo()`, + save/reuse via `LoadGeneratedMeshAsync` |
| Batch | One at a time | Multiple assets sequentially with shared opId |

**New AssetSpec fields:**

```ts
interface AssetSpec {
  // ... existing fields ...
  imageAssetId?: number;       // reference image for guided generation
  customSchema?: {             // alternative to predefinedSchema
    groups: string[];          // named part groups, e.g. ["body", "wheels", "wings"]
  };
  scale?: number;              // post-generation scale multiplier (0.1-10, default 1)
  saveName?: string;           // if set, store generationId for LoadGeneratedMeshAsync reuse
}
```

### 1.6 `compose_scene(SceneSpec)` — M5 completion

The stretch goal from PLAN.md, now with the enhanced tools:

```ts
interface SceneSpec {
  terrain?: TerrainSpec;
  mood?: MoodSpec;
  water?: WaterSpec;
  materialColors?: MaterialColorSpec;
  structures?: StructureSpec[];
  scatters?: ScatterSpec[];
  assets?: AssetSpec[];
  sculpts?: SculptSpec[];    // post-terrain refinements
}
```

Sequences operations in dependency order:
terrain → water → materialColors → mood → structures → scatters → assets → sculpts.
Per-step validation with partial-failure reporting.

---

## 2. Terrain Material Reference

Full list of scriptable `Enum.Material` terrain values for use in schemas:

| Material | Character | Typical biome use |
|----------|-----------|-------------------|
| `Air` | Empty | Subtraction operations |
| `Asphalt` | Dark road surface | Urban, paths |
| `Basalt` | Dark volcanic rock | Volcanic biome |
| `Brick` | Red clay | Urban structures |
| `Cobblestone` | Rough stone path | Villages, paths |
| `Concrete` | Gray smooth | Urban, foundations |
| `CrackedLava` | Glowing lava | Volcanic biome |
| `Glacier` | Blue-white ice | Arctic, mountains |
| `Grass` | Green surface | Forest, plains, default |
| `Ground` | Brown dirt | Under grass, paths |
| `Ice` | Slippery clear | Snow biome, frozen lakes |
| `LeafyGrass` | Textured green | Jungle, lush areas |
| `Limestone` | Pale stone | Cliffs, canyon walls |
| `Mud` | Wet brown | Swamp, riverbanks |
| `Pavement` | Sidewalk gray | Urban |
| `Rock` | Gray stone | Mountains, caves |
| `Salt` | White crystal | Desert flats |
| `Sand` | Tan granular | Desert, beaches |
| `Sandstone` | Layered tan | Desert, mesa |
| `Slate` | Dark layered rock | Mountain peaks |
| `Snow` | White powder | Snow biome, peaks |
| `WoodPlanks` | Brown boards | Docks, cabins |
| `Water` | Liquid | Ocean, lakes, rivers |

---

## 3. New Biomes (for enhanced build_terrain)

### 3.1 Swamp

- **Materials:** Mud (base), LeafyGrass (patches), Water (pools), Ground (banks)
- **Noise:** Low-frequency undulation, very low height (2-6 studs above water)
- **Character:** Scattered shallow pools, moss/mud ground, minimal elevation

### 3.2 Volcanic

- **Materials:** Basalt (base), CrackedLava (fissures), Rock (slopes), Slate (peaks)
- **Noise:** Single caldera shape (radial with crater), ridged noise for lava flows
- **Character:** Central crater, radiating lava channels, dark rocky landscape

### 3.3 Jungle

- **Materials:** LeafyGrass (canopy floor), Mud (undergrowth), Ground (paths), Rock (cliffs)
- **Noise:** High-frequency, dense variation, steep ravines
- **Character:** Dense vertical variation, gorges, river valleys

### 3.4 Savanna

- **Materials:** Grass (dry), Ground (exposed earth), Sand (dry patches), Rock (kopjes)
- **Noise:** Very gentle, wide-open rolling with occasional rock outcrops
- **Character:** Flat expanses with scattered rocky mounds (inselbergs)

### 3.5 Mesa

- **Materials:** Sandstone (layers), Sand (floor), Rock (caps), Limestone (bands)
- **Noise:** Stepped/terraced noise (quantized height bands), flat tops
- **Character:** Flat-topped plateaus with layered cliff faces, canyon floors

---

## 4. Implementation Milestones

### M5 — compose_scene (from PLAN.md stretch)
- Implement `compose_scene(SceneSpec)` sequencing all existing tools
- Per-step validation, partial-failure reporting
- Acceptance: "Build a snowy village with a wizard tower at sunset" → single
  tool call produces terrain + mood + structures + scatters

### M6 — WriteVoxels terrain upgrade
- Migrate all biome templates from `FillBlock` to `WriteVoxels` chunk pipeline
- Add smooth occupancy gradients at surface voxels
- Add multi-octave noise with configurable persistence
- Multi-material altitude/slope layering per biome
- Ocean floor + shoreline gradient for water biomes
- Skip-empty-chunk optimization
- **Acceptance:** 1024×1024 forest terrain generates in < 15s (vs current ~60s),
  with visibly smoother surface compared to FillBlock output

### M7 — New biomes + terrain sculpting
- Add 5 new biomes: swamp, volcanic, jungle, savanna, mesa
- Implement `sculpt_terrain` tool (fill/subtract/smooth/replace/paint)
- Optional erosion pass for existing biomes
- **Acceptance:** Each new biome produces distinct, recognizable terrain;
  sculpt_terrain can carve a cave and smooth its edges

### M8 — Water & material control
- Implement `configure_water` tool
- Implement `set_material_colors` tool
- Inline water config in TerrainSpec
- **Acceptance:** "tropical island with turquoise water" produces visible
  water color change; material color overrides persist across tool calls

### M9 — Enhanced 3D asset generation
- Custom SchemaDefinition support (named groups beyond Body1/Car5)
- Image-guided generation via `Content.fromAssetId()`
- `ScaleTo()` post-generation sizing
- `LoadGeneratedMeshAsync` reuse via saved generation IDs
- **Acceptance:** Custom 3-group schema generates a multi-part model;
  image reference produces a model influenced by the reference

---

## 5. Template Architecture Changes

### 5.1 WriteVoxels chunk pipeline (M6)

New shared template: `terrain_voxel_writer.luau`

```
-- Receives: heightmap data, material rules, chunk params
-- Pattern:
-- 1. Decode heightmap from injected Luau table literal (like scatter placements)
-- 2. For each 64×64 chunk:
--    a. Compute column heights via bilinear interpolation
--    b. Build 3D material + occupancy arrays
--    c. Apply altitude-based material rules
--    d. Set surface occupancy to fractional for smooth edges
--    e. Skip all-air chunks
--    f. Call WriteVoxels
--    g. Yield every N chunks
```

Biome-specific logic moves to TypeScript: each biome defines:
- `heightFunction(x, z, seed, octaves, persistence) → number`
- `materialRules: { altitude: number; slope: number; material: TerrainMaterial }[]`
- `waterLevel: number`

The server pre-computes the heightmap + material grid, encodes it, and injects
it into the shared voxel writer template. This keeps biome creativity in TS
and the hot voxel loop in optimized Luau.

### 5.2 Server-side heightmap computation (M6)

```ts
interface HeightmapData {
  width: number;
  depth: number;
  resolution: number;        // 4 (voxel size)
  heights: number[];         // flat array, row-major
  materials: number[];       // material enum indices, same layout
  maxHeight: number;
}
```

Pre-computed in TypeScript using a multi-octave noise function, then injected
into the template as a Luau table literal (same pattern as scatter placements).

### 5.3 Payload size management

A 2048×2048 terrain at 4-stud resolution = 512×512 = 262,144 height+material
entries. As a Luau table literal this is ~4-5 MB — within the 10 MB bridge
limit. For larger terrains, use base64-encoded buffer strings (matching
GravyPouch's approach) decoded in Luau using the `buffer` library.

---

## 6. Testing Strategy Additions

- **WriteVoxels unit tests:** Verify heightmap computation produces expected
  height values for known seeds; verify material assignment rules.
- **Chunk math tests:** Verify chunk boundaries, edge cases (non-power-of-2
  sizes), skip-empty logic.
- **New biome template tests:** Each new biome gets 3 parameter sets in the
  e2e harness (min/typical/max size).
- **Performance benchmarks:** Measure build_terrain wall time for 256², 512²,
  1024² before and after WriteVoxels migration.

---

## 7. Risk Register

| Risk | Mitigation |
|------|-----------|
| WriteVoxels 3D array construction in Luau is slow for large terrains | Pre-compute heightmap server-side; only build voxel arrays in Luau per-chunk |
| Heightmap payload exceeds 10 MB bridge limit | Use base64 buffer encoding (2 bytes/height = 512 KB for 512×512) |
| `LoadGeneratedMeshAsync` requires a generation ID that expires | Document TTL; warn user if reuse fails |
| Custom SchemaDefinition may have undocumented constraints | Verify against live docs before implementing; graceful fallback to Body1 |
| Smooth occupancy may look worse than full-fill for small terrains | Make it optional (default off for size < 256) |
| 5 new biomes increase template maintenance | Share voxel writer template; biome logic in TS, not Luau |

---

## 8. Status

| Milestone | Status | Dependencies |
|-----------|--------|-------------|
| M5 — compose_scene | NOT STARTED | M0–M4 complete |
| M6 — WriteVoxels terrain | NOT STARTED | M5 (uses compose for integration test) |
| M7 — New biomes + sculpt | NOT STARTED | M6 (WriteVoxels pipeline) |
| M8 — Water & material control | NOT STARTED | M6 |
| M9 — Enhanced 3D generation | NOT STARTED | M3 (existing generate_asset) |
