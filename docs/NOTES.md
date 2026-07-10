# Environment Tools — Development Notes

Milestone acceptance notes and findings. Updated as each milestone completes.

---

## M0 — Orientation

**Status:** NOT STARTED

### Upstream code review

> Document: tool registration pattern, bridge message shape, how the plugin
> executes work, existing screenshot/log tools.

- Tool registration: `TOOL_HANDLERS` map in `packages/core/src/http-server.ts`
  maps tool name strings to `(tools, body) => Promise` handlers. Tool schemas
  defined in `TOOL_DEFINITIONS` array in `packages/core/src/tools/definitions.ts`
  (each entry has `name`, `category`, `description`, `inputSchema`).
- Bridge: `BridgeService` (`packages/core/src/bridge-service.ts`) queues
  requests with 30s timeout. Plugin polls `GET /poll`, executes, responds
  via `POST /respond` with request ID + result.
- Plugin handlers: `studio-plugin/src/modules/handlers/` — grouped by domain
  (Query, Property, Script, Instance, etc.).
- Plugin communication: `studio-plugin/src/modules/Communication.ts` — HTTP
  polling loop (500ms interval), routes incoming requests to handlers.

TODO:
- [ ] Document plugin build procedure (roblox-ts compile, artifact format, Plugins folder paths)
- [ ] Verify GenerationService API from live docs (see PLAN.md 5.2)
- [ ] Check bridge payload size limits for large Luau templates
- [ ] Check if upstream has screenshot/viewport capture tool

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
