# wechat-ilink-bot

基于微信 iLink Bot 协议的 bot 开发 monorepo。

## 项目结构

```
packages/
  ilink-bot-sdk/    @pawastation/ilink-bot-sdk — iLink Bot 协议 SDK
  echo-bot/         echo bot 示例（收到什么回什么，private）
```

## 前置条件

- Node.js >= 18
- [pnpm](https://pnpm.io/)

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

## Packages

### [@pawastation/ilink-bot-sdk](./packages/ilink-bot-sdk/)

从 [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 提取的独立 iLink Bot 协议客户端。零框架依赖，覆盖扫码登录、消息收发、媒体加解密传输等完整能力。

### [echo-bot](./packages/echo-bot/) (private)

基于 ilink-bot-sdk 的最简 bot 示例：扫码登录 → 长轮询收消息 → 原样回复（文本 + 媒体）。

```bash
pnpm --filter echo-bot login    # 扫码登录
pnpm --filter echo-bot start    # 启动 echo bot
```

## License

MIT
