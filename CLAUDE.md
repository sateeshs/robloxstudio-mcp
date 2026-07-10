# robloxstudio-mcp fork — Environment & Asset Generation Layer

Fork of boshyxd/robloxstudio-mcp (TypeScript monorepo, MIT). We are adding a
high-level environment-building layer per **plans/PLAN.md** (read it before
starting any milestone work). Current milestone status is tracked in
docs/NOTES.md.

## Stack
- Node 20+, TypeScript, npm workspaces (monorepo under packages/)
- MCP server: stdio transport to AI clients; Express HTTP bridge on localhost
- Studio plugin: Luau, long-polls the bridge
- Validation: zod for all tool inputs
- Tests: jest with ts-jest ESM preset (unit, 30s timeout) + live-Studio e2e harness (planned: test/templates.e2e.test.ts)

## Commands
- Install: `npm install`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm test`
- E2E template harness (requires open Studio + blank baseplate): `npm run test:e2e`

## Architecture (one paragraph)
AI client → (stdio MCP) → server → (HTTP bridge) → Studio plugin → Roblox APIs.
Environment tools live in packages/environment-tools. The LLM sends structured
SceneSpec JSON; the server renders pre-tested Luau templates
(packages/environment-tools/src/luau/templates/) and ships ONE script per tool
call to the plugin, which executes it in pcall inside a ChangeHistoryService
recording. Full diagram and data flow: PLAN.md §1.

## Non-negotiable rules
1. NEVER have environment tools emit or accept freeform Luau. Tools take
   zod-validated specs; templates do the building. `run_code` is not a
   building block for environment tools.
2. Every instance we create gets CollectionService tag "EnvTools" and
   attribute EnvToolsOp. `clear_environment` may only delete tagged instances.
3. One plugin round-trip per tool call. No per-object HTTP chatter.
4. Clamp numeric inputs, don't reject (kid-friendly). Warn in the result.
5. Template placeholders are filled ONLY via the sanitizing renderer
   (src/luau/render.ts). Never string-concatenate user input into Luau.
6. Do not modify existing upstream tools or the bridge protocol; only add.
   Mirror upstream conventions for tool registration and error shapes.
7. Every new/changed template must pass the e2e harness before commit.
8. GenerationService (Cube 3D) is a beta API — never code it from memory;
   follow the cube-generation-service skill to verify against live docs first.

## Where things go
- New tools: packages/environment-tools/src/tools/ (one file per tool)
- Schemas: packages/environment-tools/src/schema/sceneSpec.ts (single source of truth)
- Luau templates: packages/environment-tools/src/luau/templates/*.luau
- Plugin endpoints: studio-plugin/src/modules/handlers/ (new endpoints go here)
- Kid-mode allowlist: config/kid-mode.json
- Telemetry log (do not commit): logs/scenes.jsonl

## Current status
- **M0 (Orientation)**: COMPLETE — see docs/NOTES.md for all findings
  (plugin build procedure, bridge limits, screenshot tool, GenerationService API).
- **M1–M5**: NOT STARTED — packages/environment-tools/ does not exist yet.
- Upstream tool registration pattern: see `TOOL_HANDLERS` map in
  packages/core/src/http-server.ts and `TOOL_DEFINITIONS` in
  packages/core/src/tools/definitions.ts. New environment tools must follow
  the same registration pattern.
- BridgeService request timeout is 30s (packages/core/src/bridge-service.ts).
  Luau templates doing heavy work (large terrain fills) must stay under this
  or be chunked with yields.

## Workflow
- Work milestone by milestone (plans/PLAN.md §7). Do not start M(n+1) until M(n)
  acceptance criteria pass and are noted in docs/NOTES.md.
- Before writing a Luau template: invoke the luau-template-authoring skill.
- Before adding an MCP tool: invoke the mcp-tool-authoring skill.
- After any template change: invoke the studio-validation skill.
- Conventional commits (feat:, fix:, test:, docs:). Small commits per tool.
