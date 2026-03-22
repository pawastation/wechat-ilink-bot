**English** | [中文](./README.zh-CN.md)

# @pawastation/ilink-bot-sdk

A standalone SDK for the WeChat iLink Bot protocol — handle QR login, messaging, and media transfer without any framework dependency.

Part of [wechat-ilink-bot](../../README.md) monorepo.

## Background

This package is extracted from [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin), Tencent's official [OpenClaw](https://docs.openclaw.ai) plugin for WeChat integration via the iLink Bot protocol.

However, openclaw-weixin is tightly coupled to the OpenClaw framework — plugin lifecycle, account persistence, message pipeline orchestration, agent routing, and more — making it impossible to reuse the protocol layer in other projects. This SDK extracts the **iLink Bot protocol interaction** into a standalone package, enabling:

- Building WeChat bots quickly (echo servers, customer service bots)
- Integrating with other AI agent frameworks (Claude Code, custom agents)
- Running in edge runtime environments (Cloudflare Workers + Durable Objects)

## Install

```bash
npm install @pawastation/ilink-bot-sdk
```

## Quick Start

See [echo-bot](../echo-bot/) for a complete example. Here is the core flow:

```typescript
import {
  loginWithQR,
  runPoller,
  sendText,
  bodyFromItemList,
  setContextToken,
  getContextToken,
} from "@pawastation/ilink-bot-sdk";

// 1. QR login to obtain credentials
const result = await loginWithQR({
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  callbacks: {
    onQRCode: (url) => console.log(`Scan QR: ${url}`),
    onStatus: (s) => console.log(s),
  },
});
// result.botToken, result.accountId, result.baseUrl

// 2. Long-poll for messages and reply
await runPoller({
  apiOpts: { baseUrl: result.baseUrl, token: result.botToken },
  accountId: result.accountId,
  async onMessage(msg) {
    const from = msg.from_user_id ?? "";
    if (msg.context_token) setContextToken(result.accountId, from, msg.context_token);

    const text = bodyFromItemList(msg.item_list);
    if (text) {
      await sendText({
        to: from,
        text: `Echo: ${text}`,
        opts: {
          baseUrl: result.baseUrl,
          token: result.botToken,
          contextToken: getContextToken(result.accountId, from),
        },
      });
    }
  },
});
```

## API Overview

### Auth

| Export | Description |
|---|---|
| `loginWithQR(opts)` | QR code login with callbacks (not tied to any terminal) |

### Messaging

| Export | Description |
|---|---|
| `runPoller(opts)` | Long-polling loop with backoff, session expiry handling, and flood protection |
| `sendText(params)` | Send a text message |
| `sendImage(params)` | Send an image (upload first) |
| `sendVideo(params)` | Send a video (upload first) |
| `sendFileMessage(params)` | Send a file attachment (upload first) |
| `sendMediaData(params)` | All-in-one: auto-detect MIME, upload, and send |
| `sendErrorNotice(params)` | Send an error notice (fire-and-forget) |

### Parsing

| Export | Description |
|---|---|
| `bodyFromItemList(items)` | Extract text from item_list (handles quoted messages) |
| `findMediaItem(items)` | Find the first downloadable media item (IMAGE > VIDEO > FILE > VOICE) |
| `isMediaItem(item)` | Check whether an item is a media type |
| `markdownToPlainText(text)` | Convert Markdown to plain text (WeChat does not render Markdown) |

### Media

| Export | Description |
|---|---|
| `uploadImage/Video/File(params)` | Upload media to CDN (accepts Buffer) |
| `downloadMediaFromItem(item, cdnBaseUrl)` | Download and decrypt media from a message item |
| `downloadAndDecryptBuffer(...)` | Low-level: CDN download + AES decryption |
| `silkToWav(buf)` | Convert SILK voice to WAV (requires silk-wasm to be installed separately) |

### State

| Export | Description |
|---|---|
| `setContextToken/getContextToken` | Session context token cache |
| `ConfigManager` | Typing ticket cache with TTL and retry backoff |
| `pauseSession/isSessionPaused/assertSessionActive` | Session expiry pause management |
| `memorySyncStorage()` | In-memory SyncStorage implementation |

### Utils

| Export | Description |
|---|---|
| `getMimeFromFilename/getExtensionFromMime` | MIME type mapping |
| `generateId/tempFileName` | ID and temporary filename generation |
| `redactToken/redactBody/redactUrl` | Log redaction |
| `defaultLogger/noopLogger` | Built-in Logger implementations |

## Relation to openclaw-weixin

| Aspect | openclaw-weixin | ilink-bot-sdk |
|---|---|---|
| Positioning | WeChat channel plugin for OpenClaw | Standalone iLink Bot protocol client |
| Framework deps | Requires `openclaw/plugin-sdk` | Zero framework dependencies |
| Storage | File system (~/.openclaw/) | No built-in storage; injectable |
| Message handling | Full pipeline: auth -> route -> agent -> reply | Send/receive only; processing logic is yours |
| Account mgmt | Multi-account persistence + config schema | Provides login flow; credential management is yours |
| Runtime | Node.js 22+ | Node.js 18+, edge-runtime compatible |

### What was extracted

- iLink Bot HTTP API wrappers (getUpdates, sendMessage, getUploadUrl, getConfig, sendTyping)
- CDN media encryption/decryption (AES-128-ECB)
- Message construction and sending (text, image, video, file)
- Context token management
- Long-polling loop (with backoff, session expiry handling, SyncStorage interface)
- QR code login flow
- Markdown to plain text conversion (WeChat does not render Markdown)
- SILK voice to WAV conversion (optional, dynamic import of silk-wasm)
- Protocol type definitions

### What stays in openclaw-weixin

- OpenClaw plugin registration and lifecycle
- Message pipeline orchestration (framework auth -> agent routing -> reply dispatch)
- File system persistence (account credentials, log files)
- Debug mode (per-account toggle + full-chain timing trace)
- Slash commands (/echo, /toggle-debug)

## Protocol Notes

Tested behavior of the iLink Bot protocol, verified through echo-bot:

| Behavior | Finding |
|---|---|
| Message mode | Passive reply only (requires `context_token`); bot cannot initiate conversations |
| Text limit | Up to 4000 characters per message |
| Consecutive replies | 10+ on a single `context_token` with no rate limiting observed |
| Typing indicator | `sendTyping` triggers the "typing..." status correctly |
| Streaming | `MessageState.GENERATING` is non-functional — WeChat shows only the first GENERATING message and ignores subsequent updates and FINISH |
| Voice STT | Server-side transcription; result available in `voice_item.text` |
| Voice audio | Downloaded as SILK format; convertible to WAV via silk-wasm, but cannot be sent back as a voice message (file attachment only) |
| CDN encryption | AES-128-ECB; `aes_key` in JSON is a base64-encoded hex string (not raw bytes) |
| Long polling | 35s default timeout; server may adjust via `longpolling_timeout_ms` |
| Cursor reset protection | No protocol-level safeguard. `runPoller` provides two layers: skip entire batch when exceeding `maxBatchSize` (default 50); skip individual messages older than `maxMessageAgeMs` (default 5 min). Both thresholds are configurable or can be set to 0 to disable |

## Design Principles

- **Zero dependencies**: No production dependencies; uses only standard APIs
- **Injectable platform capabilities**: Storage, logging, and other platform-specific concerns are injected via interfaces, never hard-coded
- **Protocol completeness**: Covers all iLink Bot protocol capabilities without omission
- **Minimal Node.js API surface**: Only uses `node:crypto` (`fetch`, `URL`, `Buffer`, etc. are universal runtime APIs)

## License

MIT
