# Roblox Studio MCP Plugin Installation Guide

Complete your AI assistant integration with this easy-to-install Studio plugin. Works with Claude Code, Claude Desktop, and any MCP-compatible AI.

## Quick Installation

### Method 1: Roblox Creator Store (Easiest)
1. **Install from Creator Store:**
   - Visit: https://create.roblox.com/store/asset/132985143757536
   - Click **"Install"** button
   - Plugin automatically opens in Studio

2. **No restart needed** - Plugin appears immediately in toolbar!

### Method 2: Direct Download
1. **Download the plugin:**
   - **GitHub Release**: [Download MCPPlugin.rbxmx](https://github.com/boshyxd/robloxstudio-mcp/releases/latest/download/MCPPlugin.rbxmx)
   - This is the official Roblox plugin format

2. **Install to plugins folder:**
   - **Windows**: Save to `%LOCALAPPDATA%/Roblox/Plugins/`
   - **macOS**: Save to `~/Documents/Roblox/Plugins/`
   - **Or use Studio**: Plugins tab > Plugins Folder > drop the file

3. **Restart Roblox Studio** - Plugin appears automatically!

### Method 3: Save as Local Plugin
1. **Copy the plugin code:**
   - Open [plugin.server.luau](https://github.com/boshyxd/robloxstudio-mcp/blob/main/studio-plugin/plugin.server.luau) on GitHub
   - Copy all the code (Ctrl+A, Ctrl+C)

2. **Create in Studio:**
   - Open Roblox Studio with any place
   - Create a new Script in ServerScriptService
   - Paste the plugin code
   - **Right-click script** > **"Save as Local Plugin..."**
   - Name it "Roblox Studio MCP"

3. **Plugin appears immediately** in your toolbar!

## Setup & Configuration

### 1. Enable HTTP Requests (Required)
**Game Settings** > **Security** > **"Allow HTTP Requests"**

### 2. Activate the Plugin
**Plugins toolbar** > Click **"MCP Server"** button
- **Green status** = Connected and ready
- **Red status** = Disconnected (normal until MCP server runs)

### 3. Install MCP Server

Choose your deployment mode:

---

## Deployment Mode A: Same Machine (Default)

Everything runs on one machine. Claude Code spawns the MCP server as a local
subprocess via stdio.

```
┌─────────────────────────────────────────┐
│              Your Machine               │
│                                         │
│  Claude Code ──stdio──> MCP Server      │
│                           │             │
│                       HTTP bridge       │
│                           │             │
│                     Roblox Studio       │
│                     + Plugin (polls)    │
└─────────────────────────────────────────┘
```

**Step 1 — Install the MCP server in Claude Code:**

```bash
claude mcp add robloxstudio -- npx -y robloxstudio-mcp@latest
```

**Step 2 — Download the Studio plugin:**

```bash
# macOS
curl -L "https://github.com/boshyxd/robloxstudio-mcp/releases/download/v2.5.1-plugin-fix/MCPPlugin.rbxmx" \
  -o ~/Documents/Roblox/MCPPlugin.rbxmx

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/boshyxd/robloxstudio-mcp/releases/download/v2.5.1-plugin-fix/MCPPlugin.rbxmx" `
  -OutFile "$env:LOCALAPPDATA\Roblox\Plugins\MCPPlugin.rbxmx"
```

**Step 3 — Open Roblox Studio**, enable HTTP Requests, activate plugin. Done!

---

## Deployment Mode B: Cross-Machine (Network)

Run Roblox Studio + MCP server on one machine (System A), and Claude Code on
another machine (System B). Uses Streamable HTTP transport instead of stdio.

```
System B                              System A
┌───────────────┐    HTTP/MCP        ┌──────────────────────┐
│  Claude Code  │ ─────────────────> │  MCP Server (:58741) │
│               │ <ip>:58741/mcp     │         │            │
└───────────────┘                    │     HTTP bridge      │
                                     │         │            │
                                     │   Roblox Studio      │
                                     │   + Plugin (polls)   │
                                     └──────────────────────┘
```

### System A (Roblox Studio + MCP Server)

**Step 1 — Start the MCP server directly (not via Claude):**

```bash
npx -y robloxstudio-mcp@latest
```

The server binds to `0.0.0.0:58741` (all network interfaces) and logs:
```
Streamable HTTP MCP endpoint: http://localhost:58741/mcp
```

**Step 2 — Download and install the Studio plugin:**

```bash
# macOS
curl -L "https://github.com/boshyxd/robloxstudio-mcp/releases/download/v2.5.1-plugin-fix/MCPPlugin.rbxmx" \
  -o ~/Documents/Roblox/MCPPlugin.rbxmx

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/boshyxd/robloxstudio-mcp/releases/download/v2.5.1-plugin-fix/MCPPlugin.rbxmx" `
  -OutFile "$env:LOCALAPPDATA\Roblox\Plugins\MCPPlugin.rbxmx"
```

**Step 3 — Open Roblox Studio**, enable HTTP Requests, activate plugin.

**Step 4 — Find System A's IP address:**

```bash
# Linux/macOS
hostname -I | awk '{print $1}'

# Windows (PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
```

**Step 5 — Allow port through firewall (if needed):**

```bash
# Linux (ufw)
sudo ufw allow 58741/tcp

# Windows (PowerShell, run as admin)
New-NetFirewallRule -DisplayName "RobloxStudio MCP" -Direction Inbound -Port 58741 -Protocol TCP -Action Allow

# macOS (usually no action needed on LAN)
```

### System B (Claude Code)

**Step 1 — Connect Claude Code to System A via HTTP:**

```bash
claude mcp add robloxstudio --transport http --url http://<SYSTEM_A_IP>:58741/mcp
```

Replace `<SYSTEM_A_IP>` with System A's LAN IP (e.g. `192.168.1.100`).

**Step 2 — Verify connectivity:**

```bash
curl http://<SYSTEM_A_IP>:58741/health
# Expected: {"status":"ok",...}
```

If that returns OK, Claude Code will connect without issues.

**For Claude Desktop (cross-machine):**

```json
{
  "mcpServers": {
    "robloxstudio-mcp": {
      "type": "streamableHttp",
      "url": "http://192.168.1.100:58741/mcp"
    }
  }
}
```

### Cross-Machine Checklist

- [ ] Both machines on the same LAN / network
- [ ] System A: MCP server running (`npx -y robloxstudio-mcp@latest`)
- [ ] System A: Roblox Studio open with plugin active (green status)
- [ ] System A: Firewall allows inbound TCP port 58741
- [ ] System B: `curl http://<IP>:58741/health` returns OK
- [ ] System B: Claude configured with `--transport http --url http://<IP>:58741/mcp`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ROBLOX_STUDIO_HOST` | `0.0.0.0` | Network interface to bind |
| `ROBLOX_STUDIO_PORT` | `58741` | HTTP bridge port |

Example: run on a custom port:
```bash
ROBLOX_STUDIO_PORT=9000 npx -y robloxstudio-mcp@latest
```

---

<details>
<summary>Note for native Windows users (stdio mode)</summary>
If you encounter issues with the same-machine setup, you may need to run it through `cmd`:

```json
{
  "mcpServers": {
    "robloxstudio-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "robloxstudio-mcp@latest"]
    }
  }
}
```
</details>

## How It Works

1. **AI calls tool** > MCP server queues request
2. **Plugin polls** every 500ms for work
3. **Plugin executes** Studio API calls
4. **Plugin responds** with extracted data
5. **AI receives** comprehensive Studio information

**Available Tools:** 50+ specialized tools including environment building,
terrain sculpting, 3D asset generation, visual effects, file trees, scripts,
properties, attributes, tags, and more!

## Troubleshooting

### Plugin Missing from Toolbar
- Verify file saved to correct plugins folder
- Restart Roblox Studio completely
- Check Output window for error messages

### "HTTP 403 Forbidden" Errors
- Enable "Allow HTTP Requests" in Game Settings > Security
- Verify MCP server is running (status should show connected)

### Plugin Shows "Disconnected"
- **Normal behavior** when MCP server isn't running
- Click "MCP Server" button to activate
- Install MCP server using commands above

### Connection Issues (Same Machine)
- Check Windows Firewall isn't blocking localhost:58741
- Restart both Studio and your AI assistant
- Check Studio Output window for detailed error messages

### Connection Issues (Cross-Machine)
- Verify both machines are on the same network
- Test with `curl http://<IP>:58741/health` from System B
- Check firewall rules on System A (port 58741 TCP inbound)
- If using Wi-Fi, ensure AP isolation is disabled on your router
- Try `ping <SYSTEM_A_IP>` from System B to confirm connectivity
- In the Studio plugin dock widget, verify the server URL shows the correct IP

### CORS Issues
- CORS is enabled by default (`Access-Control-Allow-Origin: *`)
- No additional configuration needed for cross-origin requests

## Security & Privacy

- **LAN-only by default**: Communication stays on your local network
- **No external servers**: Plugin talks to localhost or your LAN IP only
- **No authentication**: Anyone on your network can reach the MCP endpoint
  when running in cross-machine mode. Only use on trusted networks.
- **No data collection**: Your projects remain private

## Advanced Usage

### Plugin Features
- **Real-time status**: Visual connection indicators
- **Smart polling**: Exponential backoff for failed connections
- **Error recovery**: Automatic retry with timeout handling
- **Debug friendly**: Comprehensive logging in Output window

### Customization
- **Server URL**: Modify in plugin UI (default: http://localhost:58741)
- **Poll interval**: 500ms default (editable in code)
- **Timeout settings**: 30-second request timeouts

### Development Mode
```lua
-- Enable debug logging in plugin code:
local DEBUG_MODE = true
```

## Pro Tips

- **Keep Studio open** while using AI assistants
- **Plugin auto-connects** when MCP server starts
- **Monitor status** via the dock widget
- **Cross-machine**: Run heavy Studio on a powerful desktop, use Claude Code from a laptop
- **Use environment tools** to build entire game worlds from natural language
- **Kid mode**: Use `--profile kid` for safe, kid-friendly tool access
