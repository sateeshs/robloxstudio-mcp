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

import type { RobloxStudioTools } from '@robloxstudio-mcp/core';

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

export const ENV_TOOL_HANDLERS: Record<string, EnvToolHandler> = {
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

export { ENV_TOOL_DEFINITIONS };
