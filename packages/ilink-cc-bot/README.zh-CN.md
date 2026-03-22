[English](./README.md) | **中文**

# @pawastation/ilink-cc-bot

适用于 [Claude Code](https://code.claude.com) 的微信 iLink Bot 通道。在 Claude Code 会话中直接接收和回复微信消息。

## 工作原理

```
微信用户 ←→ iLink API ←→ ilink-cc-bot (MCP Server) ←→ Claude Code (stdio)
```

ilink-cc-bot 是一个由 Claude Code 作为子进程启动的 MCP 服务器。它：
- 通过 `@pawastation/ilink-bot-sdk` 轮询微信新消息
- 将消息以 `<channel>` 事件的形式推送到 Claude Code 会话中
- 提供 `reply` 工具，让 Claude 可以回复微信消息

## 快速开始

### 1. 登录

```bash
npx @pawastation/ilink-cc-bot login
```

使用微信扫描二维码。登录凭据保存在 `~/.wechat-ilink-bot/cc-bot/`。

### 2. 配置

```bash
npx @pawastation/ilink-cc-bot setup
```

该命令会输出需要添加到项目中的 `.mcp.json` 配置。示例：

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

### 3. 启动 Claude Code

```bash
claude --dangerously-load-development-channels server:wechat  # 开发阶段
# claude --channels server:wechat  # 通过白名单审批后
```

现在在微信上给 Bot 发送消息，消息将出现在你的 Claude Code 会话中。

## 功能特性

- 接收文本消息，支持引用消息上下文
- 接收媒体文件（图片、文件、视频），自动保存为本地临时文件
- 语音消息自动语音转文字
- 回复文本消息（自动将 markdown 转换为纯文本）
- 回复文件附件（图片、文档等）
- Claude 思考时显示输入状态指示
- 同步游标持久化，重启后继续

## 通道事件格式

微信收到的消息在 Claude 上下文中显示为：

```
<channel source="wechat" from_user_id="xxx@im.wechat">
Hello from WeChat!
</channel>
```

媒体附件包含本地文件路径：

```
<channel source="wechat" from_user_id="xxx@im.wechat">
[Attachment: /path/to/temp/file.jpg (image/jpeg)]
</channel>
```

## 限制

- **仅支持单会话**：一个微信账号同一时间只能在一个 Claude Code 会话中使用。同时运行两个会话会导致消息和回复重复。
- **仅支持被动回复**：Bot 只能回复已发送过消息的用户（需要来自入站消息的 `context_token`）。

## 回复工具

Claude 可以使用 `reply` 工具进行回复：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `to` | string | 是 | 入站消息中的 `from_user_id` |
| `text` | string | 是 | 回复文本（纯文本） |
| `file_path` | string | 否 | 要作为附件发送的文件的绝对路径 |

## CLI 命令

| 命令 | 说明 |
|---|---|
| `npx @pawastation/ilink-cc-bot login` | 扫描二维码连接微信 |
| `npx @pawastation/ilink-cc-bot start` | 启动 MCP 通道服务器（由 Claude Code 调用） |
| `npx @pawastation/ilink-cc-bot setup` | 输出 `.mcp.json` 配置 |

## 许可证

MIT
