[English](./README.md) | **中文**

# @pawastation/ilink-bot-sdk

微信 iLink Bot 协议的独立 SDK，可以在不依赖任何框架的情况下完成扫码登录、收发消息、媒体传输的全流程接入。

本包是 [wechat-ilink-bot](../../README.md) monorepo 的核心模块。

## 背景

本项目从 [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 中提取而来。openclaw-weixin 是腾讯微信官方的 [OpenClaw](https://docs.openclaw.ai) 插件，实现了通过 iLink Bot 协议接入微信的完整能力。

但 openclaw-weixin 的代码与 OpenClaw 框架深度耦合（插件生命周期、账号持久化、消息管道编排、agent 路由等），无法在其他项目中复用其协议层逻辑。本 SDK 将 **iLink Bot 协议交互** 部分独立出来，使其可以用于：

- 快速搭建微信 bot（如 echo server、客服机器人）
- 集成到其他 AI agent 框架（如 Claude Code、自定义 agent）
- 在边缘运行时环境中使用（如 Cloudflare Workers + Durable Objects）

## 安装

```bash
npm install @pawastation/ilink-bot-sdk
```

## 快速开始

完整示例见 [echo-bot](../echo-bot/)。以下是核心流程：

```typescript
import {
  loginWithQR,
  runPoller,
  sendText,
  bodyFromItemList,
  setContextToken,
  getContextToken,
} from "@pawastation/ilink-bot-sdk";

// 1. 扫码登录，获取凭证
const result = await loginWithQR({
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  callbacks: {
    onQRCode: (url) => console.log(`请扫码: ${url}`),
    onStatus: (s) => console.log(s),
  },
});
// result.botToken, result.accountId, result.baseUrl

// 2. 长轮询收消息 + 回复
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
        text: `收到: ${text}`,
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

## API 概览

### 认证

| 导出 | 说明 |
|---|---|
| `loginWithQR(opts)` | QR 扫码登录，回调式（不绑定终端） |

### 消息收发

| 导出 | 说明 |
|---|---|
| `runPoller(opts)` | 长轮询循环，含退避策略、session 过期处理、消息防洪保护 |
| `sendText(params)` | 发送文本消息 |
| `sendImage(params)` | 发送图片（需先上传） |
| `sendVideo(params)` | 发送视频（需先上传） |
| `sendFileMessage(params)` | 发送文件附件（需先上传） |
| `sendMediaData(params)` | 一体化：按 MIME 自动上传 + 发送 |
| `sendErrorNotice(params)` | 发送错误通知（fire-and-forget） |

### 消息解析

| 导出 | 说明 |
|---|---|
| `bodyFromItemList(items)` | 从 item_list 提取文本（含引用消息处理） |
| `findMediaItem(items)` | 查找可下载的媒体项（IMAGE > VIDEO > FILE > VOICE） |
| `isMediaItem(item)` | 判断是否为媒体类型 |
| `markdownToPlainText(text)` | Markdown → 纯文本（微信不渲染 markdown） |

### 媒体传输

| 导出 | 说明 |
|---|---|
| `uploadImage/Video/File(params)` | 上传媒体到 CDN（接受 Buffer） |
| `downloadMediaFromItem(item, cdnBaseUrl)` | 从消息项下载解密媒体 |
| `downloadAndDecryptBuffer(...)` | 低级接口：CDN 下载 + AES 解密 |
| `silkToWav(buf)` | SILK 语音转 WAV（需自行安装 silk-wasm） |

### 状态管理

| 导出 | 说明 |
|---|---|
| `setContextToken/getContextToken` | 会话 context token 缓存 |
| `ConfigManager` | typing ticket 缓存（TTL + 退避重试） |
| `pauseSession/isSessionPaused/assertSessionActive` | session 过期暂停管理 |
| `memorySyncStorage()` | 内存 SyncStorage 实现 |

### 工具

| 导出 | 说明 |
|---|---|
| `getMimeFromFilename/getExtensionFromMime` | MIME 类型映射 |
| `generateId/tempFileName` | ID 和临时文件名生成 |
| `redactToken/redactBody/redactUrl` | 日志脱敏 |
| `defaultLogger/noopLogger` | 内置 Logger 实现 |

## 与 openclaw-weixin 的关系

| 维度 | openclaw-weixin | ilink-bot-sdk |
|---|---|---|
| 定位 | OpenClaw 的微信 channel 插件 | 独立的 iLink Bot 协议客户端 |
| 框架依赖 | 依赖 `openclaw/plugin-sdk` | 零框架依赖 |
| 存储 | 文件系统（~/.openclaw/） | 无内置存储，可注入 |
| 消息处理 | 完整管道：auth → route → agent → reply | 只负责收发，处理逻辑由使用方实现 |
| 账号管理 | 多账号持久化 + 配置 schema | 提供登录流程，凭证管理由使用方负责 |
| 运行环境 | Node.js 22+ | Node.js 18+，兼容 edge runtime |

### 提取了什么

- iLink Bot HTTP API 封装（getUpdates、sendMessage、getUploadUrl、getConfig、sendTyping）
- CDN 媒体加解密传输（AES-128-ECB）
- 消息构建与发送（文本、图片、视频、文件）
- Context token 管理
- 长轮询循环（含退避策略、session 过期处理、SyncStorage 接口）
- QR 扫码登录流程
- Markdown → 纯文本转换（微信不渲染 markdown）
- SILK 语音转 WAV（可选，dynamic import silk-wasm）
- 协议类型定义

### 留在 openclaw-weixin 的

- OpenClaw 插件注册与生命周期
- 消息管道编排（框架鉴权 → agent 路由 → 回复分发）
- 文件系统持久化（账号凭证、日志写文件）
- 调试模式（per-account 开关 + 全链路 timing trace）
- Slash 命令（/echo、/toggle-debug）

## 协议行为备忘

通过 echo-bot 实际测试验证的 iLink Bot 协议行为：

| 行为 | 结论 |
|---|---|
| 消息模式 | 仅被动回复（需要 `context_token`），不支持 bot 主动发起 |
| 单条文本上限 | 4000 字符以内可正常发送 |
| 连续回复条数 | 同一个 `context_token` 下连续发 10 条无报错，未观察到限速 |
| Typing 指示器 | `sendTyping` 可正常触发"正在输入"状态 |
| 流式下发 | `MessageState.GENERATING` 不可用——微信端只显示第一条 GENERATING 消息，后续更新和 FINISH 被忽略 |
| 语音转文字 | 服务端自动转写，`voice_item.text` 字段携带结果 |
| 语音音频 | 下载为 SILK 格式，可通过 silk-wasm 转 WAV，但无法作为语音消息回发（只能当文件附件） |
| CDN 媒体加密 | AES-128-ECB，`aes_key` 在 JSON 中为 base64 编码的 hex 字符串（非 raw bytes） |
| 长轮询 | 默认 35s 超时，服务端可通过 `longpolling_timeout_ms` 动态调整 |
| Cursor 重置风险 | 协议本身无防护。SDK 的 `runPoller` 内置两层保护：单次批量超过 `maxBatchSize`（默认 50）条时跳过全部只推进 cursor；单条消息超过 `maxMessageAgeMs`（默认 5 分钟）时跳过。两个阈值均可配置或设为 0 禁用 |

## 设计原则

- **零框架依赖**：生产依赖为零，只使用标准 API
- **平台能力注入**：存储、日志等平台相关能力通过接口注入，不硬编码实现
- **协议完整性**：覆盖 iLink Bot 协议的所有能力，不遗漏
- **最小 Node.js API 依赖**：仅使用 `node:crypto`（`fetch`、`URL`、`Buffer` 等为运行时通用 API）

## License

MIT
