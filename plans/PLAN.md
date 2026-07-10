# PLAN.md — Environment & Asset Generation Layer for robloxstudio-mcp

## 0. Mission

Extend a fork of `boshyxd/robloxstudio-mcp` (TypeScript monorepo, MIT) with a **high-level environment-building layer** so that an AI client (Claude Code / Claude Desktop) can reliably build complete Roblox environments — terrain, assets, scattering, lighting — from natural-language prompts, executed as few, deterministic, validated operations instead of hundreds of freeform low-level calls.

Primary user: a kid prompting "build a snowy village with a wizard tower" and getting a working world. Secondary user: a parent/developer extending the toolset.

**Design principle (non-negotiable):** The LLM's job is to emit a *structured SceneSpec (JSON)*. Deterministic, pre-tested Luau templates do the building. The LLM never writes freeform world-building Luau in the happy path. `run_code` remains available but is NOT the mechanism for environment tools.

---

## 1. End-to-End Pipeline Architecture

```
┌──────────────────────┐
│  AI Client            │  Claude Code / Claude Desktop / Cursor
│  (kid's prompt)       │
└──────────┬───────────┘
           │ MCP (stdio)
┌──────────▼───────────┐
│  MCP Server (fork)    │  packages/server (existing)
│                       │  + packages/environment-tools (NEW)
│  - SceneSpec schema   │    · zod validation of all tool inputs
│  - Tool registry      │    · Luau template renderer (parameter injection)
│  - Kid-mode allowlist │    · Validation orchestrator (retry loop)
└──────────┬───────────┘
           │ HTTP (localhost bridge, existing Express layer)
┌──────────▼───────────┐
│  Studio Plugin        │  studio-plugin/ (existing Luau plugin, long-polls bridge)
│  (Luau)               │  + template executor endpoint (NEW)
│                       │  + Cube mesh generation endpoint (NEW)
│                       │  + snapshot/telemetry endpoint (NEW)
└──────────┬───────────┘
           │ Roblox APIs
┌──────────▼───────────────────────────────────────────────┐
│  Roblox Studio                                             │
│  · Terrain API (FillBlock/FillRegion/FillBall/WriteVoxels) │
│  · Instance tree (parts, models, folders)                  │
│  · Lighting / Atmosphere / Sky / PostEffects               │
│  · GenerationService (Cube 3D mesh generation — beta)      │
│  · Output log (validation signal)                          │
└───────────────────────────────────────────────────────────┘

Side channel (Phase 2, optional):
┌──────────────────────┐
│ Local Cube 3D service │  Python, Roblox/cube v0.5 weights
│ text+bbox → .obj      │  Used only if in-Studio GenerationService
└──────────────────────┘  is unavailable/insufficient. Import via plugin.
```

### Data flow for one request ("spooky forest at night")
1. AI client calls `plan_scene` (optional helper) or directly calls tools with a SceneSpec fragment.
2. MCP server validates the spec against zod schemas. Invalid → structured error back to LLM with the exact field problem (LLM self-corrects).
3. Server renders the matching Luau template with injected, sanitized parameters → single script payload.
4. Payload sent through bridge → plugin executes it in ONE round-trip inside `pcall`, wrapped in a ChangeHistoryService recording (undo-able).
5. Plugin returns `{ok, log, createdInstancePaths, durationMs}`.
6. Server runs the validation checklist (Section 6). On failure: automatic bounded retry (max 2) with the error appended, then surface a clean diagnostic to the LLM.
7. Result + telemetry appended to `logs/scenes.jsonl` (future fine-tune dataset).

---

## 2. Repo Changes

Work on a fork. Do not modify existing tool behavior; only add.

```
packages/
  environment-tools/           # NEW package
    src/
      index.ts                 # registers tools with the existing server registry
      schema/
        sceneSpec.ts           # zod: SceneSpec, TerrainSpec, MoodSpec, ScatterSpec, AssetSpec, StructureSpec
      tools/
        buildTerrain.ts
        setMood.ts
        scatterObjects.ts
        generateAsset.ts
        buildStructure.ts
        snapshotScene.ts
        clearEnvironment.ts
      luau/
        templates/             # .luau files with {{param}} placeholders
          terrain_fill.luau
          terrain_biome_forest.luau
          terrain_biome_desert.luau
          terrain_biome_snow.luau
          terrain_biome_island.luau
          mood_presets.luau
          scatter.luau
          structure_house.luau
          structure_tower.luau
          structure_bridge.luau
          generate_mesh.luau   # GenerationService call
          snapshot.luau
          clear_env.luau
        render.ts              # template renderer + param sanitizer (see 5.3)
      validation/
        orchestrator.ts        # execute → check → retry loop
        checks.ts
      telemetry/
        sceneLog.ts            # JSONL logger (prompt→spec→result)
    test/
      templates.e2e.test.ts    # harness: runs every template on blank baseplate (see 8)
      schema.test.ts
studio-plugin/
  src/
    modules/handlers/executeTemplate.luau   # NEW: batched executor, pcall + ChangeHistory
    modules/handlers/generateMesh.luau      # NEW: GenerationService wrapper
    modules/handlers/snapshot.luau          # NEW: bounds/instance-count/lighting snapshot
config/
  kid-mode.json                # tool allowlist profile
docs/
  ENVIRONMENT_TOOLS.md         # user docs + example prompts
```

Follow the repo's existing conventions: tool registration pattern, error shape, HTTP bridge message format, lint/typecheck scripts (`npm run lint`, `npm run typecheck`). Read the existing `packages/` code FIRST and mirror its structure; do not invent a parallel framework.

---

## 3. SceneSpec Schema (single source of truth)

Define in `schema/sceneSpec.ts` with zod; export JSON Schema for docs. Keep enums tight — creativity lives in composition, not free strings.

```ts
type Vec3 = { x: number; y: number; z: number };

interface TerrainSpec {
  biome: "forest" | "desert" | "snow" | "island" | "plains" | "mountains" | "flat";
  size: { x: number; z: number };        // studs, clamp 64..2048
  heightVariation: "flat" | "gentle" | "hilly" | "mountainous";
  water: boolean;
  seed?: number;                          // reproducibility
  origin?: Vec3;                          // default {0,0,0}
}

interface MoodSpec {
  preset: "morning" | "noon" | "sunset" | "night" | "spooky" | "underwater" | "alien";
  fogDensity?: number;                    // 0..1
  overrides?: { clockTime?: number; brightness?: number; ambientHex?: string };
}

interface ScatterSpec {
  source: { kind: "template"; name: "tree_pine" | "tree_oak" | "rock" | "bush" | "cactus" | "snowman" | "crystal" }
        | { kind: "instancePath"; path: string }   // e.g. a Cube-generated model
        | { kind: "assetId"; id: number };          // Creator Store
  count: number;                          // clamp 1..500
  area: { origin: Vec3; size: { x: number; z: number } };
  align: "terrain" | "yLevel";
  randomRotation: boolean;
  scaleRange?: [number, number];          // clamp 0.25..4
  minSpacing?: number;
  seed?: number;
}

interface AssetSpec {
  prompt: string;                         // sanitized, <= 200 chars
  boundingBox?: Vec3;                     // studs; converted for the API
  position?: Vec3;
  anchorToTerrain?: boolean;
  name?: string;
}

interface StructureSpec {
  template: "house" | "tower" | "bridge" | "wall" | "campfire" | "dock";
  position: Vec3;
  scale?: number;                         // clamp 0.5..3
  material?: "wood" | "stone" | "brick" | "ice" | "neon";
  seed?: number;
}

interface SceneSpec {                     // for future compose_scene tool (Phase 3)
  terrain?: TerrainSpec;
  mood?: MoodSpec;
  structures?: StructureSpec[];
  scatters?: ScatterSpec[];
  assets?: AssetSpec[];
}
```

All numeric inputs are **clamped, not rejected**, with a warning in the tool result (kid-friendly: never hard-fail on "too many trees", just cap and say so).

---

## 4. MCP Tools (Phase 1 surface)

Each tool: zod-validated input, one plugin round-trip, structured result `{ok, summary, createdPaths[], warnings[], log}`. Write LLM-facing descriptions carefully — they are the prompt interface. Include 2–3 example calls in each description.

1. **`build_terrain(TerrainSpec)`** — clears/creates terrain in region via biome template (FillBlock/FillRegion composites + material layering; simple value-noise height function in Luau seeded by `seed`). Returns bounds.
2. **`set_mood(MoodSpec)`** — Lighting + Atmosphere + Sky preset application.
3. **`scatter_objects(ScatterSpec)`** — server-side deterministic placement math (seeded PRNG in TS, positions computed BEFORE sending) → template clones/places in one batch. Terrain-align via raycast in Luau.
4. **`build_structure(StructureSpec)`** — parameterized part-built structures (procedural in Luau from the template, not stored models).
5. **`generate_asset(AssetSpec)`** — Cube 3D mesh generation (Section 5.2).
6. **`snapshot_scene()`** — returns instance counts by category, terrain bounds, lighting summary, last N Output lines. Used by the LLM and by validation.
7. **`clear_environment(confirm: true)`** — resets terrain + removes only instances tagged `EnvTools` (CollectionService tags on everything we create). Never touches user content.

Reuse existing repo tools for inspection/screenshot if present (check for a screenshot/viewport tool; if absent, skip visual checks in Phase 1).

---

## 5. Key Implementation Details

### 5.1 Luau template execution (plugin side)
- New plugin endpoint `executeTemplate`: receives `{templateId, luauSource, opId}`.
- Wrap in `ChangeHistoryService:TryBeginRecording` / finish — every tool call is one undo step.
- Wrap in `pcall`; capture `print`/`warn`/error output scoped to the operation (use LogService with opId markers: template prints `[ENVTOOLS:<opId>] BEGIN/END`).
- Tag every created instance: `CollectionService:AddTag(inst, "EnvTools")` plus attribute `EnvToolsOp = opId`.
- Hard budget: template must complete in < 20s; long fills chunked with `task.wait()` yields to avoid freezing Studio.

### 5.2 `generate_asset` — Cube 3D integration
- Primary path: in-Studio `GenerationService` (Cube 3D Mesh Generation API, **beta**). ⚠️ The exact method name/signature and enablement steps (beta feature toggle, publish/permissions requirements) MUST be verified against current docs before coding: fetch `https://create.roblox.com/docs/llms.txt` and the GenerationService / mesh-generation pages. Do not code from memory.
- Template `generate_mesh.luau`: calls the API with `{prompt, boundingBox}`, yields on the async result, parents resulting MeshPart/Model to `workspace.EnvTools.Assets`, applies position/anchor, tags it, returns the instance path.
- Handle: API-disabled error (return actionable message telling the user to enable the beta in Studio), timeout (60s), moderation rejection of prompt (surface politely).
- Fallback path (Phase 2, feature-flagged OFF by default): local Cube service (`Roblox/cube` v0.5, Python) generating `.obj`; import via plugin `InsertService`/asset import is messy — only pursue if GenerationService proves inadequate. Keep as a stub interface `MeshProvider` so both paths share the tool.

### 5.3 Template renderer & sanitization (server side)
- Templates are `.luau` files with `{{name}}` placeholders. Renderer substitutes ONLY typed values:
  - numbers → validated finite, clamped, `toString`
  - enums → mapped through a TS lookup table to Luau literals (never raw user strings)
  - the ONLY free string is `AssetSpec.prompt` → strip to `[\w\s,.'-]`, length-cap, embed via `string.format("%q", ...)`-equivalent escaping on the TS side.
- Renderer refuses any template with unresolved placeholders. Unit-test injection attempts (quotes, `]]`, newlines, Luau keywords).

### 5.4 Kid-mode profile
- `config/kid-mode.json`: allowlist = the 7 tools above + read-only inspection tools from the base repo. Excluded: `run_code`, script-editing tools, delete/mass-property tools.
- Server flag `--profile kid` (or env `MCP_PROFILE=kid`) filters tool registration at startup. Default profile = everything (dev mode).

---

### 5.5 Plugin lifecycle & dev loop (IMPORTANT — the enhancement ships a modified plugin)
- This fork modifies BOTH sides of the bridge. The stock plugin from the
  Creator Store / upstream releases does NOT contain the new endpoints
  (`executeTemplate`, `generateMesh`, `snapshot`) and will fail every
  environment tool call with unknown-operation errors.
- The user must **disable/remove the store-installed robloxstudio-mcp plugin**
  before using the built one — two plugins polling the same bridge port race
  each other for requests. Add a startup check: include a `pluginVersion` +
  capability list in the plugin's poll handshake; if the server detects a
  plugin lacking the new endpoints, environment tools return a clear
  "install the dev plugin (npm run plugin:install)" message instead of a
  cryptic failure.
- M0 must document the plugin build procedure (roblox-ts compile, output
  .rbxm/.rbxmx artifact, local Studio Plugins folder path on Windows and macOS).
- M1 adds `npm run plugin:build` and `npm run plugin:install` (build + copy
  the artifact into the local Studio Plugins folder with per-OS path
  detection; print "restart Studio or use Reload Plugins to apply").
- Document clearly: this plugin/bridge architecture is separate from Studio's
  official built-in MCP server (Assistant → Manage MCP Servers). They can
  coexist as different MCP servers in the client config; kid-mode setups only
  need ours.

## 6. Validation Loop (orchestrator)

After each execution, before returning success:
1. `ok == true` from pcall.
2. Output log between BEGIN/END markers contains no `error`/stack traces.
3. Post-conditions per tool via `snapshot`:
   - build_terrain → terrain voxel count in region > 0 within expected bounds
   - scatter → created count == requested (post-clamp), all tagged
   - structure/asset → instance exists at path, bounding box within 2× declared size
   - set_mood → Lighting properties match preset (± tolerance)
4. On failure: retry up to 2× (re-render template with same seed; second retry with fallback simplification, e.g. smaller region). Then return `ok:false` with the log excerpt and a one-line kid-readable summary.
5. Every attempt logged to `logs/scenes.jsonl`: `{ts, tool, inputSpec, ok, retries, durationMs, error?, clientPromptHint?}`. This file is the seed dataset for a future fine-tune — treat schema stability as important.

---

## 7. Milestones & Acceptance Criteria

**M0 — Orientation (no code output beyond notes)**
- Read existing server + plugin code; document in `docs/NOTES.md`: tool registration pattern, bridge message shape, how the plugin executes work, existing screenshot/log tools.
- Document the plugin build-and-install procedure end to end: build command, output artifact name/format, local Studio Plugins folder path on Windows and macOS, and how the plugin identifies itself to the bridge (needed for the 5.5 version handshake).
- Verify GenerationService current API from official docs (5.2). Record findings.

**M1 — Skeleton + first tool**
- `environment-tools` package registered; `build_terrain` with `flat` + `forest` biomes; template executor endpoint in plugin; tagging + undo working.
- `npm run plugin:build` + `npm run plugin:install` scripts (5.5); plugin version/capability handshake in the poll payload; server-side friendly error when a stale/stock plugin is detected.
- ✅ Accept: from Claude Code, "make a 512×512 forest terrain" produces terrain in one tool call; `clear_environment` fully reverts; Studio undo (Ctrl+Z) reverts a build in one step; `plugin:install` places the artifact in the correct Plugins folder on the dev OS; with the stock plugin connected instead, `build_terrain` returns the actionable install message, not a raw error.

**M2 — Core toolset**
- All biomes, `set_mood`, `scatter_objects`, `build_structure` (house + tower), `snapshot_scene`, `clear_environment`. Validation orchestrator active.
- ✅ Accept: scripted sequence terrain→mood→scatter(50 trees)→structure completes with all validations green on a blank baseplate, < 60s total, zero freeform Luau from the LLM.

**M3 — Cube asset generation**
- `generate_asset` via GenerationService with full error handling.
- ✅ Accept: "generate a small wizard tower asset and place it at the center" yields a placed, tagged MeshPart/Model; disabled-beta and moderation errors return actionable messages, not stack traces.

**M4 — Kid mode + polish**
- Profile allowlist; `docs/ENVIRONMENT_TOOLS.md` with 10 example kid prompts and expected behavior; telemetry logging on.
- ✅ Accept: with `--profile kid`, `run_code` and script tools are absent from the MCP tool list; the 10 example prompts each succeed end-to-end.

**M5 (stretch) — `compose_scene(SceneSpec)`**
- One tool that sequences terrain→mood→structures→scatters→assets from a full SceneSpec with per-step validation and partial-failure reporting.

---

## 8. Testing Strategy

- **Unit (TS):** schema validation, clamping, renderer sanitization/injection cases, placement math determinism (same seed → same positions).
- **Template harness (e2e):** a runner that, against a live Studio instance on a blank baseplate, executes EVERY template with 3 parameter sets (min / typical / max), asserts validation checks pass, then `clear_environment`. Run before shipping any template change. (This harness doubles as the future fine-tune data validator.)
- **Regression:** existing repo test suite must stay green; run `lint` + `typecheck` in CI script.
- Manual checklist in docs: Windows + Mac, Claude Desktop + Claude Code.

## 9. Risks / Open Questions (resolve during M0)

1. GenerationService exact API, enablement, and whether it works in unpublished local places — verify from docs, do not assume.
2. Base repo's bridge payload size limits (large Luau templates) — check; chunk if needed.
3. Terrain fills on big regions freezing Studio — chunked writes with yields; benchmark 2048².
4. Screenshot capability for visual validation — use if the base repo has it; otherwise defer.
5. Upstream churn: pin the fork to a tagged release (v2.7.x); document rebase policy.
6. Stock plugin conflict: a store-installed upstream plugin polling the same bridge port races the dev plugin and lacks new endpoints — mitigated by the 5.5 version handshake; setup docs must say "disable the store plugin."

## 10. Out of Scope (do not build now)

- Local Cube 3D Python service (stub interface only).
- Fine-tuning any model; dataset logging only.
- Multiplayer/team-create concerns; single local Studio session assumed.
- Publishing to npm; local install via `npm link` / absolute path in MCP config.

---

## 11. Current Status

**As of 2026-07-10:** No milestones have been completed. M0 orientation work
has not started — `docs/NOTES.md` does not exist, `packages/environment-tools/`
has not been created, and GenerationService API has not been verified.

| Milestone | Status |
|-----------|--------|
| M0 — Orientation | COMPLETE — see docs/NOTES.md |
| M1 — Skeleton + first tool | NOT STARTED |
| M2 — Core toolset | NOT STARTED |
| M3 — Cube asset generation | NOT STARTED |
| M4 — Kid mode + polish | NOT STARTED |
| M5 — compose_scene (stretch) | NOT STARTED |
