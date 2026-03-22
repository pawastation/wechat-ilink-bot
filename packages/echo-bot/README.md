**English** | [中文](./README.zh-CN.md)

# echo-bot

Minimal WeChat bot example using `@pawastation/ilink-bot-sdk` — echoes back whatever it receives. Supports multi-account and test commands.

## Usage

### 1. Login

```bash
pnpm --filter echo-bot login
```

Scan the QR code in the terminal to authorize your WeChat account. Each login adds a new account, with credentials saved to `~/.wechat-ilink-bot/echo-bot/accounts/`.

You can run `login` multiple times to add different WeChat accounts.

### 2. Start

```bash
pnpm --filter echo-bot start
```

The bot starts independent long-polling for each logged-in account and echoes back any received messages.

## Commands

| Command | Description |
|---|---|
| `/help` | List available commands |
| `/typing` | Test typing indicator (3 seconds) |
| `/long` | Send near 4000-char long text |
| `/markdown` | Markdown vs plain text comparison |
| `/stress` | Send 10 consecutive messages |
| `/stream` | Test GENERATING → FINISH streaming |
| Default | Echo text/image/video/file as-is |

## Features

- Text echo with `[echo]` prefix
- Image/video/file: download, decrypt, and reupload
- Voice messages with STT: replies with server-side transcription text
- Quoted messages: replies include quoted context
- Multi-account concurrent: independent polling per account
- Sync cursor persistence: no missed messages after restart
