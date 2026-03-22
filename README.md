**English** | [中文](./README.zh-CN.md)

# wechat-ilink-bot

Monorepo for WeChat iLink Bot protocol development.

## Project Structure

```
packages/
├── ilink-bot-sdk/   # @pawastation/ilink-bot-sdk
├── ilink-cc-bot/    # @pawastation/ilink-cc-bot
└── echo-bot/        # echo bot example (private)
```

## Prerequisites

- Node.js >= 18
- [pnpm](https://pnpm.io/)

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Packages

### [@pawastation/ilink-bot-sdk](./packages/ilink-bot-sdk/)

Standalone iLink Bot protocol SDK extracted from [@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin). Zero framework dependencies, covers QR login, messaging, and encrypted media transfer.

### [@pawastation/ilink-cc-bot](./packages/ilink-cc-bot/)

WeChat channel for Claude Code. Receive and reply to WeChat messages from your Claude Code session.

```bash
npx @pawastation/ilink-cc-bot login    # QR code login
npx @pawastation/ilink-cc-bot setup    # Show .mcp.json configuration
```

### [echo-bot](./packages/echo-bot/) (private)

Minimal echo bot example for SDK validation: QR login, long-poll for messages, echo back text and media as-is.

```bash
pnpm --filter echo-bot login    # QR code login
pnpm --filter echo-bot start    # Start the echo bot
```

## License

MIT
