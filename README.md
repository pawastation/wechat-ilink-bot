**English** | [中文](./README.zh-CN.md)

# wechat-ilink-bot

Chat with [Claude Code](https://code.claude.com) through WeChat — ask questions, trigger tasks, and get replies, all from your phone.

```
WeChat User ←→ iLink API ←→ ilink-cc-bot (MCP Server) ←→ Claude Code
```

## Quick Start

```bash
# 1. Login with WeChat QR code
npx @pawastation/ilink-cc-bot login

# 2. Get .mcp.json configuration
npx @pawastation/ilink-cc-bot setup

# 3. Add the config to your project, then start Claude Code
claude --dangerously-load-development-channels server:wechat
```

Send a message to the bot on WeChat — Claude Code receives it, works on your codebase, and replies back to WeChat.

## What's in this repo

### [@pawastation/ilink-cc-bot](./packages/ilink-cc-bot/) — WeChat channel for Claude Code

The main package. An [MCP](https://modelcontextprotocol.io) server that Claude Code spawns as a subprocess to bridge WeChat messages into your session.

- Receive text, images, files, videos, and voice messages from WeChat
- Claude replies via the `reply` tool — auto-converts markdown to plain text
- Typing indicator while Claude is thinking
- [Full documentation →](./packages/ilink-cc-bot/)

### [@pawastation/ilink-bot-sdk](./packages/ilink-bot-sdk/) — iLink Bot Protocol SDK

The protocol layer powering ilink-cc-bot. Use it to build your own WeChat bot without any framework dependency.

Extracted from [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin), covering QR login, messaging, CDN media encryption, long-polling, and more.

```bash
npm install @pawastation/ilink-bot-sdk
```

- [Full documentation →](./packages/ilink-bot-sdk/)

### [echo-bot](./packages/echo-bot/) — Example

A minimal bot that echoes everything back. Useful for testing the SDK and exploring the iLink Bot protocol.

- [Full documentation →](./packages/echo-bot/)

## Development

```bash
pnpm install && pnpm build && pnpm test
```

## License

MIT
