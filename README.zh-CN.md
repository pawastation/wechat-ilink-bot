[English](./README.md) | **中文**

# wechat-ilink-bot

微信 iLink Bot 协议开发 Monorepo。

## 项目结构

```
packages/
├── ilink-bot-sdk/   # @pawastation/ilink-bot-sdk
├── ilink-cc-bot/    # @pawastation/ilink-cc-bot
└── echo-bot/        # echo bot 示例（私有）
```

## 环境要求

- Node.js >= 18
- [pnpm](https://pnpm.io/)

## 开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test
```

## 包说明

### [@pawastation/ilink-bot-sdk](./packages/ilink-bot-sdk/)

从 [@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 提取的独立 iLink Bot 协议 SDK。零框架依赖，涵盖扫码登录、消息收发和加密媒体传输。

### [@pawastation/ilink-cc-bot](./packages/ilink-cc-bot/)

Claude Code 的微信通道。在 Claude Code 会话中接收和回复微信消息。

```bash
npx @pawastation/ilink-cc-bot login    # 扫码登录
npx @pawastation/ilink-cc-bot setup    # 查看 .mcp.json 配置
```

### [echo-bot](./packages/echo-bot/)（私有）

用于 SDK 验证的最小回声机器人示例：扫码登录、长轮询收消息、原样回复文本和媒体。

```bash
pnpm --filter echo-bot login    # 扫码登录
pnpm --filter echo-bot start    # 启动 echo bot
```

## 许可证

MIT
