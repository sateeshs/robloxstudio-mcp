/**
 * Register environment tools with the core server.
 * Call this before getAllTools() to include environment tools in the MCP tool list.
 */
import { ENV_TOOL_DEFINITIONS } from './index.js';
import { prepareBuildTerrain } from './tools/buildTerrain.js';
import { prepareClearEnvironment } from './tools/clearEnvironment.js';
import { prepareSetMood } from './tools/setMood.js';
import { prepareScatterObjects } from './tools/scatterObjects.js';
import { prepareBuildStructure } from './tools/buildStructure.js';
import { prepareSnapshotScene } from './tools/snapshotScene.js';
import { prepareGenerateAsset } from './tools/generateAsset.js';

import * as fs from 'fs';
import * as path from 'path';

import type { RobloxStudioTools } from '@robloxstudio-mcp/core';

/** Append a telemetry entry to logs/scenes.jsonl (best-effort, never throws) */
function logTelemetry(entry: {
  tool: string;
  inputSpec: Record<string, unknown>;
  ok: boolean;
  durationMs: number;
  error?: string;
  opId?: string;
}): void {
  try {
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
    fs.appendFileSync(path.join(logDir, 'scenes.jsonl'), line);
  } catch {
    // Telemetry is best-effort; never block tool execution
  }
}

export interface EnvToolHandler {
  (tools: RobloxStudioTools, body: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function checkPluginCapability(tools: RobloxStudioTools): void {
  const bridge = tools.getBridge();
  if (!bridge.hasCapability('executeTemplate')) {
    throw new Error(
      'The connected Studio plugin does not support environment tools. ' +
      'Install the dev plugin with "npm run plugin:install" and restart Studio. ' +
      'If using the stock Creator Store plugin, disable it first — ' +
      'two plugins polling the same bridge port will race each other.'
    );
  }
}

/** Helper to execute a template and parse the response */
async function executeAndParse(
  tools: RobloxStudioTools,
  luauSource: string,
  opId: string,
): Promise<Record<string, unknown>> {
  const response = await tools.executeTemplate(luauSource, opId);
  return JSON.parse(response.content[0].text) as Record<string, unknown>;
}

/** Format a tool response as MCP TextContent */
function textContent(data: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

/** Wrap a handler with telemetry logging */
function withTelemetry(toolName: string, handler: EnvToolHandler): EnvToolHandler {
  return async (tools, body) => {
    const start = Date.now();
    try {
      const result = await handler(tools, body);
      const parsed = JSON.parse(result.content[0].text);
      logTelemetry({
        tool: toolName,
        inputSpec: body,
        ok: parsed.ok ?? true,
        durationMs: Date.now() - start,
        opId: parsed.opId,
        error: parsed.ok ? undefined : parsed.error,
      });
      return result;
    } catch (err) {
      logTelemetry({
        tool: toolName,
        inputSpec: body,
        ok: false,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

const _handlers: Record<string, EnvToolHandler> = {
  build_terrain: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareBuildTerrain(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      warnings,
      summary: result.ok
        ? `Terrain built successfully (opId: ${opId}). Use clear_environment to remove.`
        : `Terrain build failed: ${result.error}`,
    });
  },

  set_mood: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareSetMood(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      warnings,
      summary: result.ok
        ? `Mood preset applied (opId: ${opId}).`
        : `Mood set failed: ${result.error}`,
    });
  },

  scatter_objects: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareScatterObjects(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      warnings,
      summary: result.ok
        ? `Objects scattered successfully (opId: ${opId}). Use clear_environment to remove.`
        : `Scatter failed: ${result.error}`,
    });
  },

  build_structure: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareBuildStructure(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      warnings,
      summary: result.ok
        ? `Structure built (opId: ${opId}). Use clear_environment to remove.`
        : `Structure build failed: ${result.error}`,
    });
  },

  generate_asset: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareGenerateAsset(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      warnings,
      summary: result.ok
        ? `Asset generated (opId: ${opId}). ${result.instancePath ? `Placed at: ${result.instancePath}` : ''}`
        : `Asset generation failed: ${result.error}`,
    });
  },

  snapshot_scene: async (tools) => {
    checkPluginCapability(tools);
    const { luauSource, opId } = prepareSnapshotScene();
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      summary: result.ok
        ? 'Scene snapshot captured.'
        : `Snapshot failed: ${result.error}`,
    });
  },

  clear_environment: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId } = prepareClearEnvironment(body);
    const result = await executeAndParse(tools, luauSource, opId);
    return textContent({
      ...result,
      opId,
      summary: result.ok
        ? 'Environment cleared — all EnvTools-tagged instances removed.'
        : `Clear failed: ${result.error}`,
    });
  },
};

// Wrap all handlers with telemetry
export const ENV_TOOL_HANDLERS: Record<string, EnvToolHandler> = Object.fromEntries(
  Object.entries(_handlers).map(([name, handler]) => [name, withTelemetry(name, handler)])
);

export { ENV_TOOL_DEFINITIONS };
