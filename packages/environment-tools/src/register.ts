/**
 * Register environment tools with the core server.
 * Call this before getAllTools() to include environment tools in the MCP tool list.
 */
import { ENV_TOOL_DEFINITIONS } from './index.js';
import { prepareBuildTerrain } from './tools/buildTerrain.js';
import { prepareClearEnvironment } from './tools/clearEnvironment.js';

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

export const ENV_TOOL_HANDLERS: Record<string, EnvToolHandler> = {
  build_terrain: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId, warnings } = prepareBuildTerrain(body);
    const response = await tools.executeTemplate(luauSource, opId);
    const result = JSON.parse(response.content[0].text);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...result,
          opId,
          warnings,
          summary: result.ok
            ? `Terrain built successfully (opId: ${opId}). Use clear_environment to remove.`
            : `Terrain build failed: ${result.error}`,
        }),
      }],
    };
  },

  clear_environment: async (tools, body) => {
    checkPluginCapability(tools);
    const { luauSource, opId } = prepareClearEnvironment(body);
    const response = await tools.executeTemplate(luauSource, opId);
    const result = JSON.parse(response.content[0].text);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...result,
          opId,
          summary: result.ok
            ? 'Environment cleared — all EnvTools-tagged instances removed.'
            : `Clear failed: ${result.error}`,
        }),
      }],
    };
  },
};

export { ENV_TOOL_DEFINITIONS };
