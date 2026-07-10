# Environment Tools — Development Notes

Milestone acceptance notes and findings. Updated as each milestone completes.

---

## M0 — Orientation

**Status:** COMPLETE

### Upstream code review

> Document: tool registration pattern, bridge message shape, how the plugin
> executes work, existing screenshot/log tools.

- **Tool registration:** `TOOL_HANDLERS` map in `packages/core/src/http-server.ts`
  maps tool name strings to `(tools, body) => Promise` handlers. Tool schemas
  defined in `TOOL_DEFINITIONS` array in `packages/core/src/tools/definitions.ts`
  (each entry has `name`, `category`, `description`, `inputSchema`).
- **Bridge:** `BridgeService` (`packages/core/src/bridge-service.ts`) queues
  requests with 30s timeout. Plugin polls `GET /poll`, executes, responds
  via `POST /respond` with request ID + result.
- **Plugin handlers:** `studio-plugin/src/modules/handlers/` — grouped by domain
  (Query, Property, Script, Instance, etc.).
- **Plugin communication:** `studio-plugin/src/modules/Communication.ts` — HTTP
  polling loop (500ms interval), routes incoming requests to handlers via
  `routeMap` (95+ endpoints, lines 28-95).

### Plugin build-and-install procedure

**Build command:** `npm run build:plugin` (or `npm run build:plugin:inspector`
for read-only variant).

**Build process** (`scripts/build-plugin.mjs`):
1. Reads version from root `package.json`
2. Compiles TypeScript → Luau via `rbxtsc` (roblox-ts)
3. Intermediate output: `studio-plugin/out/`
4. Injects `__VERSION__` placeholder with monorepo version
5. Generates `.rbxmx` XML artifact
6. Auto-copies to local Plugins folder

**Artifacts:**
- `studio-plugin/MCPPlugin.rbxmx` — full plugin
- `studio-plugin/MCPInspectorPlugin.rbxmx` — read-only variant

**Installation paths:**
- **Windows:** `%LOCALAPPDATA%/Roblox/Plugins/MCPPlugin.rbxmx`
- **macOS:** `~/Documents/Roblox/Plugins/MCPPlugin.rbxmx`

The build script auto-detects platform and copies the artifact
(`scripts/build-plugin.mjs`, lines 206-221).

**Plugin-to-bridge handshake:**
- On init, plugin generates a GUID instance ID (`Communication.ts:17`)
- Sends `POST /ready` with `{instanceId, role, pluginReady, timestamp}`
  (Communication.ts:313-327)
- Role detected via `RunService`: "edit" / "server" / "client" (lines 20-24)
- Server responds with `assignedRole`
- Subsequent polls include `?instanceId=` query param
- Plugin version stored as `State.CURRENT_VERSION` (injected at build time)
- **No capability handshake exists yet** — M1 needs to add one per PLAN.md 5.5

### Bridge payload size limits

- **Express body-parser:** 50 MB limit (`http-server.ts:141-142`)
- **Roblox HttpService:** ~10 MB per request (Roblox platform limit)
- **BridgeService:** No explicit size limit; stores payloads in memory as-is
- **Practical limit: ~10 MB** due to Roblox HttpService constraint
- **Recommendation:** Luau templates must stay well under 10 MB. If large
  terrain fill templates approach this, chunk the payload server-side.

### Screenshot/viewport capture tool

**Exists:** `capture_screenshot` tool is already in upstream.

- **Definition:** `packages/core/src/tools/definitions.ts:1331-1337`
- **Handler:** `http-server.ts:93` → `tools.captureScreenshot()`
- **Plugin handler:** `studio-plugin/src/modules/handlers/CaptureHandlers.ts`
- **How it works:** Uses `CaptureService.CaptureScreenshot()`, reads pixels
  in 1024x1024 tiles, base64-encodes RGBA data, server converts to PNG
  (`packages/core/src/tools/index.ts:1679`)
- **Prerequisite:** Game Settings > Security > "Allow Mesh / Image APIs"
- **Timeout:** 10s for capture
- **Category:** `read` (available in inspector variant too)
- **Usable for validation:** Yes — can be used for visual checks in Phase 1

### GenerationService API verification

> Source: [Roblox Creator Hub docs](https://create.roblox.com/docs/reference/engine/classes/GenerationService),
> [Cube 3D beta announcement](https://devforum.roblox.com/t/beta-cube-3d-generation-tools-and-apis-for-creators/3558947),
> [4D Generation announcement](https://devforum.roblox.com/t/beta-4d-generation-unlock-new-types-of-gameplay/4331818)

**Current API (as of Feb 2026):**

Two methods available:

1. **`GenerateMeshAsync`** (DEPRECATED — sunset March 18, 2026)
   ```
   GenerateMeshAsync(inputs: Dictionary, player: Player, options?: Dictionary,
                     intermediateResultCallback?: function): Tuple
   ```
   Single mesh output, 10k triangle limit.

2. **`GenerateModelAsync`** (CURRENT — replacement)
   ```
   GenerateModelAsync(inputs: Dictionary, schema: Dictionary,
                      options?: Dictionary): Tuple
   ```
   Multi-part model output. Yields. Requires `DynamicGeneration` capability.

   **inputs:** `{TextPrompt: string, Image?: Content}`
   **schema:** `{PredefinedSchema: string}` or `{SchemaDefinition: {Groups: [...]}}`
   **Predefined schemas:** `"Car5"` (5-part vehicle), `"Body1"` (single mesh)
   **options:** Supports `Size` (bounding box) and `MaxTriangles`

3. **`LoadGeneratedMeshAsync(generationId: string): MeshPart`** — loads a
   previously generated mesh by ID.

**Enablement:**
- File > Game Settings > Security > "Editable Mesh / Editable Image APIs" must
  be enabled
- `DynamicGeneration` capability required (set in place settings)
- Available to all experiences in beta as of Feb 2026

**Published place requirement:** Not explicitly stated but strongly implied —
the API calls Roblox cloud backend which validates place ID. The
`DynamicGeneration` capability system typically requires published experiences.
**Must verify empirically in M3.**

**Rate limits:**
- `GenerateMeshAsync`: 5 generations/min/experience (legacy)
- `GenerateModelAsync`: 10 requests/min/experience, scales with concurrent users
- Free during beta

**Moderation:** Prompts are filtered against Community Standards. Moderation
rejection returns an error code. Developers not liable for user-generated
content if they haven't intentionally violated policies.

**Impact on PLAN.md:**
- Section 5.2 references `GenerateMeshAsync` — this is now deprecated.
  M3 must use `GenerateModelAsync` instead.
- The `generate_mesh.luau` template name is misleading; consider
  `generate_model.luau` when implementing.
- Schema parameter is new — tool input schema needs a `predefinedSchema` field
  (default `"Body1"` for single objects).
- The plan's fallback path (local Cube Python service) is likely unnecessary
  given `GenerateModelAsync` is now GA-beta for all experiences.

---

## M1 — Skeleton + first tool

**Status:** NOT STARTED

---

## M2 — Core toolset

**Status:** NOT STARTED

---

## M3 — Cube asset generation

**Status:** NOT STARTED

---

## M4 — Kid mode + polish

**Status:** NOT STARTED

---

## M5 — compose_scene (stretch)

**Status:** NOT STARTED
