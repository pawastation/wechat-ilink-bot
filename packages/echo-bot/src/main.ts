/**
 * Echo bot: receives messages and echoes them back.
 * Supports multiple accounts and test commands.
 *
 * Commands:
 *   /help      - list available commands
 *   /typing    - test typing indicator (3 seconds)
 *   /long      - test 4000+ char message (near limit)
 *   /markdown  - test markdown → plain text conversion
 *   /stress    - send 10 consecutive messages
 *   /stream    - test GENERATING → FINISH streaming
 *   (default)  - echo text/media back
 *
 * Usage: pnpm --filter echo-bot start
 */
import {
  runPoller,
  sendText,
  sendMessage,
  sendTyping,
  sendMediaData,
  bodyFromItemList,
  findMediaItem,
  downloadMediaFromItem,
  setContextToken,
  getContextToken,
  getExtensionFromMime,
  generateId,
  markdownToPlainText,
  ConfigManager,
  MessageType,
  MessageState,
  MessageItemType,
  TypingStatus,
} from "@pawastation/ilink-bot-sdk";
import type { WeixinMessage, ApiOptions } from "@pawastation/ilink-bot-sdk";

import { loadAllAccounts, createFileSyncStorage } from "./storage.js";
import type { AccountCredentials } from "./storage.js";

const CDN_BASE_URL = process.env.ILINK_CDN_BASE_URL || "https://novac2c.cdn.weixin.qq.com/c2c";

const HELP_TEXT = `可用命令:
/help     - 显示此帮助
/typing   - 测试"正在输入"指示器(3秒)
/long     - 测试长文本(接近4000字符限制)
/markdown - 测试 markdown 转纯文本
/stress   - 连续发送10条消息
/stream   - 测试流式下发(GENERATING→FINISH)
其他消息  - 原样回复(文本/图片/视频/文件)`;

function createMessageHandler(creds: AccountCredentials, apiOpts: ApiOptions) {
  const configManager = new ConfigManager(apiOpts);

  return async (msg: WeixinMessage) => {
    const fromUserId = msg.from_user_id ?? "";
    if (!fromUserId) return;

    if (msg.context_token) {
      setContextToken(creds.accountId, fromUserId, msg.context_token);
    }

    const contextToken = getContextToken(creds.accountId, fromUserId);
    if (!contextToken) {
      console.log(`[${creds.accountId}] [skip] no context token for ${fromUserId}`);
      return;
    }

    const text = bodyFromItemList(msg.item_list);
    const media = findMediaItem(msg.item_list);
    const cmd = text.trim().toLowerCase();

    console.log(`[${creds.accountId}] [in] from=${fromUserId} text="${text.slice(0, 60)}" media=${media ? "yes" : "no"}`);

    // ── /help ──
    if (cmd === "/help") {
      await sendText({ to: fromUserId, text: HELP_TEXT, opts: { ...apiOpts, contextToken } });
      return;
    }

    // ── /typing ──
    if (cmd === "/typing") {
      console.log(`[${creds.accountId}] [typing] fetching typing_ticket...`);
      const config = await configManager.getForUser(fromUserId, contextToken);
      if (!config.typingTicket) {
        await sendText({ to: fromUserId, text: "[typing] 获取 typing_ticket 失败", opts: { ...apiOpts, contextToken } });
        return;
      }
      console.log(`[${creds.accountId}] [typing] sending TYPING status...`);
      await sendTyping({
        ...apiOpts,
        body: { ilink_user_id: fromUserId, typing_ticket: config.typingTicket, status: TypingStatus.TYPING },
      });
      await new Promise((r) => setTimeout(r, 3000));
      await sendTyping({
        ...apiOpts,
        body: { ilink_user_id: fromUserId, typing_ticket: config.typingTicket, status: TypingStatus.CANCEL },
      });
      await sendText({ to: fromUserId, text: "[typing] 测试完成，你应该看到了3秒的\"正在输入\"", opts: { ...apiOpts, contextToken } });
      console.log(`[${creds.accountId}] [typing] done`);
      return;
    }

    // ── /long ──
    if (cmd === "/long") {
      // Generate text close to the 4000 char limit
      const line = "这是一段测试长文本，用于验证微信iLink协议的单条消息字符数限制。";
      const repeat = Math.floor(3900 / line.length);
      const longText = Array(repeat).fill(line).join("\n");
      console.log(`[${creds.accountId}] [long] sending ${longText.length} chars`);
      try {
        await sendText({ to: fromUserId, text: `[long ${longText.length}字]\n${longText}`, opts: { ...apiOpts, contextToken } });
        console.log(`[${creds.accountId}] [long] sent OK`);
      } catch (err) {
        console.error(`[${creds.accountId}] [long] FAILED: ${err}`);
        await sendText({ to: fromUserId, text: `[long] 发送失败: ${String(err).slice(0, 200)}`, opts: { ...apiOpts, contextToken } });
      }
      return;
    }

    // ── /markdown ──
    if (cmd === "/markdown") {
      const md = `# 标题
## 副标题

**粗体** 和 *斜体* 和 ~~删除线~~

- 列表项 1
- 列表项 2

> 引用文本

\`inline code\` 和代码块:

\`\`\`javascript
console.log("hello world");
\`\`\`

[链接文本](https://example.com)

| 列A | 列B |
|-----|-----|
| 1   | 2   |

---

以上是原始 markdown，下面是转换后的纯文本。`;

      const plain = markdownToPlainText(md);
      await sendText({ to: fromUserId, text: `[markdown 原文]\n${md}`, opts: { ...apiOpts, contextToken } });
      await new Promise((r) => setTimeout(r, 500));
      await sendText({ to: fromUserId, text: `[markdown 转换后]\n${plain}`, opts: { ...apiOpts, contextToken } });
      console.log(`[${creds.accountId}] [markdown] done`);
      return;
    }

    // ── /stress ──
    if (cmd === "/stress") {
      const count = 10;
      console.log(`[${creds.accountId}] [stress] sending ${count} messages`);
      for (let i = 1; i <= count; i++) {
        try {
          await sendText({
            to: fromUserId,
            text: `[stress ${i}/${count}] ${new Date().toISOString()}`,
            opts: { ...apiOpts, contextToken },
          });
          console.log(`[${creds.accountId}] [stress] sent ${i}/${count}`);
        } catch (err) {
          console.error(`[${creds.accountId}] [stress] FAILED at ${i}/${count}: ${err}`);
          break;
        }
      }
      console.log(`[${creds.accountId}] [stress] done`);
      return;
    }

    // ── /stream ──
    if (cmd === "/stream") {
      const clientId = generateId("stream");
      const chunks = ["[stream A] 第1步...", "[stream A] 第1步...第2步...", "[stream A] 完成！"];
      console.log(`[${creds.accountId}] [stream] Test A: same client_id`);
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await sendMessage({ ...apiOpts, body: { msg: {
          from_user_id: "", to_user_id: fromUserId, client_id: clientId,
          message_type: MessageType.BOT,
          message_state: isLast ? MessageState.FINISH : MessageState.GENERATING,
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: chunks[i] } }],
          context_token: contextToken,
        }}});
        if (!isLast) await new Promise((r) => setTimeout(r, 1500));
      }
      await new Promise((r) => setTimeout(r, 2000));
      console.log(`[${creds.accountId}] [stream] Test B: different client_ids`);
      for (let i = 0; i < 3; i++) {
        await sendMessage({ ...apiOpts, body: { msg: {
          from_user_id: "", to_user_id: fromUserId, client_id: generateId("stream-b"),
          message_type: MessageType.BOT, message_state: MessageState.FINISH,
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: `[stream B-${i + 1}] 独立消息` } }],
          context_token: contextToken,
        }}});
        await new Promise((r) => setTimeout(r, 500));
      }
      console.log(`[${creds.accountId}] [stream] done`);
      return;
    }

    // ── Default: echo media or text ──
    if (media) {
      try {
        const downloaded = await downloadMediaFromItem(media.item, CDN_BASE_URL);
        if (downloaded) {
          const ext = getExtensionFromMime(downloaded.mimeType);
          const filename = downloaded.filename ?? `echo${ext}`;
          await sendMediaData({
            data: downloaded.data,
            filename,
            to: fromUserId,
            text: text ? `[echo] ${text}` : "[echo]",
            apiOpts,
            contextToken,
            cdnBaseUrl: CDN_BASE_URL,
          });
          console.log(`[${creds.accountId}] [out] echoed media (${downloaded.mimeType}) to ${fromUserId}`);
          return;
        }
      } catch (err) {
        console.error(`[${creds.accountId}] [err] media echo failed: ${err}`);
      }
    }

    if (text) {
      await sendText({
        to: fromUserId,
        text: `[echo] ${text}`,
        opts: { ...apiOpts, contextToken },
      });
      console.log(`[${creds.accountId}] [out] echoed text to ${fromUserId}`);
    }
  };
}

async function main() {
  const accounts = await loadAllAccounts();
  if (accounts.length === 0) {
    console.error("No accounts found. Run 'pnpm --filter echo-bot login' first.");
    process.exit(1);
    return;
  }

  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("\nStopping...");
    controller.abort();
  });

  console.log(`Echo bot starting with ${accounts.length} account(s): ${accounts.map((a) => a.accountId).join(", ")}`);
  console.log("Press Ctrl+C to stop.\n");

  const pollers = accounts.map((creds) => {
    const apiOpts: ApiOptions = { baseUrl: creds.baseUrl, token: creds.token };
    return runPoller({
      apiOpts,
      accountId: creds.accountId,
      syncStorage: createFileSyncStorage(creds.accountId),
      signal: controller.signal,
      onMessage: createMessageHandler(creds, apiOpts),
    }).catch((err) => {
      if (controller.signal.aborted) return;
      console.error(`[${creds.accountId}] Poller error:`, err);
    });
  });

  await Promise.all(pollers);
}

main();
