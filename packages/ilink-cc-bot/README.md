**English** | [中文](./README.zh-CN.md)

# @pawastation/ilink-cc-bot

WeChat iLink Bot channel for [Claude Code](https://code.claude.com). Receive and reply to WeChat messages directly from your Claude Code session.

## How it works

```
WeChat User ←→ iLink API ←→ ilink-cc-bot (MCP Server) ←→ Claude Code (stdio)
```

ilink-cc-bot is an MCP server that Claude Code spawns as a subprocess. It:
- Polls WeChat for new messages via `@pawastation/ilink-bot-sdk`
- Pushes them into your Claude Code session as `<channel>` events
- Exposes a `reply` tool so Claude can send messages back to WeChat

## Quick start

### 1. Login

```bash
npx @pawastation/ilink-cc-bot login
```

Scan the QR code with WeChat. Credentials are saved to `~/.wechat-ilink-bot/cc-bot/`.

### 2. Configure

```bash
npx @pawastation/ilink-cc-bot setup
```

This prints the `.mcp.json` config to add to your project. Example:

```json
{
  "mcpServers": {
    "wechat": {
      "command": "npx",
      "args": ["@pawastation/ilink-cc-bot", "start"]
    }
  }
}
```

### 3. Start Claude Code

```bash
claude --dangerously-load-development-channels server:wechat  # development
# claude --channels server:wechat  # after approved to allowlist
```

Now send a message to the bot on WeChat — it will appear in your Claude Code session.

## Features

- Inbound text messages with quoted message context
- Inbound media (images, files, videos) saved as local temp files
- Voice messages with automatic speech-to-text
- Reply with text (auto markdown → plain text conversion)
- Reply with file attachments (images, documents, etc.)
- Typing indicator while Claude is thinking
- Sync cursor persistence across restarts

## Channel events

Inbound WeChat messages appear in Claude's context as:

```
<channel source="wechat" from_user_id="xxx@im.wechat">
Hello from WeChat!
</channel>
```

Media attachments include the local file path:

```
<channel source="wechat" from_user_id="xxx@im.wechat">
[Attachment: /path/to/temp/file.jpg (image/jpeg)]
</channel>
```

## Limitations

- **Single session only**: one WeChat account can only be active in one Claude Code session at a time. Running two sessions with the same account will cause duplicate messages and replies.
- **Passive reply only**: the bot can only reply to users who have sent a message first (requires `context_token` from inbound message).

## Reply tool

Claude can reply using the `reply` tool:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `to` | string | yes | `from_user_id` from the inbound message |
| `text` | string | yes | Reply text (plain text) |
| `file_path` | string | no | Absolute path to a file to send as attachment |

## CLI commands

| Command | Description |
|---|---|
| `npx @pawastation/ilink-cc-bot login` | Scan QR code to connect WeChat |
| `npx @pawastation/ilink-cc-bot start` | Start MCP channel server (used by Claude Code) |
| `npx @pawastation/ilink-cc-bot setup` | Print `.mcp.json` configuration |

## License

MIT
