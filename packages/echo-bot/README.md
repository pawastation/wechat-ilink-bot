# echo-bot

基于 `@pawastation/ilink-bot-sdk` 的最简微信 bot 示例：收到什么回什么。支持多账号和测试命令。

## 使用

### 1. 登录

```bash
pnpm --filter echo-bot login
```

扫描终端中的二维码完成微信授权。每次登录添加一个新账号，凭证保存在 `~/.wechat-ilink-bot/echo-bot/accounts/` 目录下。

可以多次执行 `login` 登录不同微信账号。

### 2. 启动

```bash
pnpm --filter echo-bot start
```

Bot 启动后为每个已登录账号启动独立的长轮询，收到消息后原样回复。

## 命令

| 命令 | 说明 |
|---|---|
| `/help` | 显示可用命令列表 |
| `/typing` | 测试"正在输入"指示器（持续 3 秒） |
| `/long` | 发送接近 4000 字符的长文本 |
| `/markdown` | 发送 markdown 原文和转换后纯文本的对比 |
| `/stress` | 连续发送 10 条消息 |
| `/stream` | 测试 GENERATING → FINISH 流式下发 |
| 普通消息 | 原样 echo 文本/图片/视频/文件 |

## 功能

- 文本消息：原样回复，前缀 `[echo]`
- 图片/视频/文件：下载解密后重新上传回复
- 语音消息（有转文字）：回复转写文本（微信服务端自动转写）
- 引用消息：回复包含引用上下文的文本
- 多账号并发：每个账号独立轮询，互不影响
- Sync cursor 持久化：重启后不丢消息
