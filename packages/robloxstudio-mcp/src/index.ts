import { RobloxStudioMCPServer, getAllTools, registerExtraTools, registerExtraHandlers } from '@robloxstudio-mcp/core';
import type { ToolDefinition } from '@robloxstudio-mcp/core';
import { ENV_TOOL_DEFINITIONS, ENV_TOOL_HANDLERS } from '@robloxstudio-mcp/environment-tools/register';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Register environment tools before getAllTools() is called
registerExtraTools(ENV_TOOL_DEFINITIONS);
registerExtraHandlers(ENV_TOOL_HANDLERS);

if (process.argv.includes('--install-plugin')) {
  const { installPlugin } = await import('./install-plugin.js');
  installPlugin().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
} else {
  const flagValue = (flag: string): string | undefined => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
  };

  const openCloudKey = flagValue('--open-cloud-key');
  const creatorId = flagValue('--creator-id');
  const creatorGroupId = flagValue('--creator-group-id');
  const profile = flagValue('--profile') ?? process.env.MCP_PROFILE;

  if (openCloudKey) process.env.ROBLOX_OPEN_CLOUD_API_KEY = openCloudKey;
  if (creatorId) process.env.ROBLOX_CREATOR_USER_ID = creatorId;
  if (creatorGroupId) process.env.ROBLOX_CREATOR_GROUP_ID = creatorGroupId;

  const require = createRequire(import.meta.url);
  const { version: VERSION } = require('../package.json');

  let tools: ToolDefinition[] = getAllTools();

  // Apply kid-mode profile filter
  if (profile === 'kid') {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const configPath = resolve(__dirname, '..', '..', '..', 'config', 'kid-mode.json');
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      const allowed = new Set<string>(config.allowedTools);
      const before = tools.length;
      tools = tools.filter(t => allowed.has(t.name));
      console.error(`[kid-mode] Loaded profile: ${tools.length}/${before} tools allowed`);
    } catch {
      console.error(`[kid-mode] Warning: could not load ${configPath}, using all tools`);
    }
  }

  const server = new RobloxStudioMCPServer({
    name: 'robloxstudio-mcp',
    version: VERSION,
    tools,
  });

  server.run().catch((error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}
