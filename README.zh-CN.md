[English](./README.md) | **中文**

# wechat-ilink-bot

通过微信和 [Claude Code](https://code.claude.com) 对话——随时提问、触发任务、接收回复，全在手机上完成。

```
微信用户 ←→ iLink API ←→ ilink-cc-bot (MCP Server) ←→ Claude Code
```

## 快速开始

```bash
# 1. 扫码登录微信
npx @pawastation/ilink-cc-bot login

# 2. 获取 .mcp.json 配置
npx @pawastation/ilink-cc-bot setup

# 3. 将配置添加到项目，然后启动 Claude Code
claude --dangerously-load-development-channels server:wechat
```

在微信给 bot 发消息，Claude Code 收到后会处理你的代码库，然后将回复发送回微信。

## 项目组成

### [@pawastation/ilink-cc-bot](./packages/ilink-cc-bot/) — Claude Code 微信通道

核心包。一个 [MCP](https://modelcontextprotocol.io) 服务器，Claude Code 将其作为子进程启动，用于在微信和你的会话之间建立桥梁。

- 接收微信的文字、图片、文件、视频和语音消息
- Claude 通过 `reply` 工具回复——自动将 markdown 转为纯文本
- Claude 思考时显示"正在输入"指示器
- [详细文档 →](./packages/ilink-cc-bot/)

### [@pawastation/ilink-bot-sdk](./packages/ilink-bot-sdk/) — iLink Bot 协议 SDK

驱动 ilink-cc-bot 的协议层。可以用它构建自己的微信 bot，无需任何框架依赖。

从 [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 提取，涵盖扫码登录、消息收发、CDN 媒体加密、长轮询等完整能力。

```bash
npm install @pawastation/ilink-bot-sdk
```

- [详细文档 →](./packages/ilink-bot-sdk/)

### [echo-bot](./packages/echo-bot/) — 示例

一个最简 bot，收到什么回什么。用于测试 SDK 和探索 iLink Bot 协议。

- [详细文档 →](./packages/echo-bot/)

## 开发

```bash
pnpm install && pnpm build && pnpm test
```

## 许可证

MIT
