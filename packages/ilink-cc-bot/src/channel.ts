#!/usr/bin/env node
/**
 * WeChat iLink Bot channel for Claude Code.
 *
 * This MCP server bridges WeChat messages into a Claude Code session:
 * - Inbound: polls WeChat via ilink-bot-sdk → pushes notifications to Claude Code
 * - Outbound: exposes a `reply` tool → sends messages back via ilink-bot-sdk
 *
 * Usage:
 *   1. npx @pawastation/ilink-cc-bot login
 *   2. npx @pawastation/ilink-cc-bot setup
 *   3. claude --dangerously-load-development-channels server:wechat
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";

import {
  runPoller,
  sendText,
  sendTyping,
  sendMediaData,
  bodyFromItemList,
  findMediaItem,
  downloadMediaFromItem,
  setContextToken,
  getContextToken,
  getExtensionFromMime,
  markdownToPlainText,
  ConfigManager,
  TypingStatus,
  noopLogger,
} from "@pawastation/ilink-bot-sdk";
import type { WeixinMessage, ApiOptions } from "@pawastation/ilink-bot-sdk";

import { loadCredentials, createFileSyncStorage, saveTempFile } from "./storage.js";

const CDN_BASE_URL = process.env.ILINK_CDN_BASE_URL || "https://novac2c.cdn.weixin.qq.com/c2c";

// Use stderr for logging (stdout is reserved for MCP stdio transport)
const log = {
  info: (msg: string) => console.error(`[ilink-cc-bot] ${msg}`),
  error: (msg: string) => console.error(`[ilink-cc-bot] ERROR: ${msg}`),
};

const INSTRUCTIONS = `You are connected to WeChat via the iLink Bot channel.

Messages from WeChat users arrive as <channel source="wechat" from_user_id="..." from_name="..."> tags.
- from_user_id: unique WeChat user identifier
- from_name: display name (if available)
- Media attachments are saved as local files; the path is included in the message.

To reply to a WeChat user, use the "reply" tool with:
- to: the from_user_id from the inbound message
- text: your reply text (plain text, not markdown — WeChat doesn't render markdown)
- file_path (optional): absolute path to a local file to send as an attachment

Important:
- Always convert markdown to plain text before replying. Use simple formatting with newlines.
- When sending code, use plain text without markdown fences.
- You can send multiple replies to break up long responses.
- Each reply must include "to" — use the from_user_id from the most recent message.`;

async function main() {
  const creds = await loadCredentials();
  if (!creds) {
    log.error("No credentials. Run: pnpm --filter ilink-cc-bot login");
    process.exit(1);
  }

  const apiOpts: ApiOptions = {
    baseUrl: creds.baseUrl,
    token: creds.token,
    logger: noopLogger, // suppress SDK logs on stdout
  };

  // ── MCP Server setup ──

  const mcp = new Server(
    { name: "wechat", version: "0.1.0" },
    {
      capabilities: {
        experimental: { "claude/channel": {} },
        tools: {},
      },
      instructions: INSTRUCTIONS,
    },
  );

  // ── Reply tool ──

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "reply",
        description: "Send a message back to a WeChat user",
        inputSchema: {
          type: "object" as const,
          properties: {
            to: {
              type: "string",
              description: "The from_user_id of the WeChat user to reply to",
            },
            text: {
              type: "string",
              description: "The reply text (plain text, not markdown)",
            },
            file_path: {
              type: "string",
              description: "Optional: absolute path to a local file to send as attachment",
            },
          },
          required: ["to", "text"],
        },
      },
    ],
  }));

  mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === "reply") {
      const { to, text, file_path } = req.params.arguments as {
        to: string;
        text: string;
        file_path?: string;
      };

      const contextToken = getContextToken(creds.accountId, to);
      if (!contextToken) {
        return {
          content: [{ type: "text" as const, text: `Error: no context token for user ${to}. The user must send a message first.` }],
        };
      }

      const plainText = markdownToPlainText(text);

      try {
        if (file_path) {
          const data = await fs.readFile(file_path);
          const filename = file_path.split("/").pop() ?? "file";
          await sendMediaData({
            data: Buffer.from(data),
            filename,
            to,
            text: plainText,
            apiOpts,
            contextToken,
            cdnBaseUrl: CDN_BASE_URL,
          });
          log.info(`replied with media to ${to}: ${filename}`);
        } else {
          await sendText({
            to,
            text: plainText,
            opts: { ...apiOpts, contextToken },
          });
          log.info(`replied to ${to}: ${plainText.slice(0, 60)}`);
        }
        stopTyping(to).catch(() => {});
        return { content: [{ type: "text" as const, text: "sent" }] };
      } catch (err) {
        stopTyping(to).catch(() => {});
        log.error(`reply failed to ${to}: ${err}`);
        return {
          content: [{ type: "text" as const, text: `Error sending reply: ${String(err)}` }],
        };
      }
    }

    throw new Error(`unknown tool: ${req.params.name}`);
  });

  // ── Typing management ──

  const configManager = new ConfigManager(apiOpts);
  // Track which users have active typing indicators
  const typingUsers = new Set<string>();
  const TYPING_KEEPALIVE_MS = 5000;
  let typingInterval: ReturnType<typeof setInterval> | undefined;

  async function startTyping(userId: string, contextToken: string) {
    const config = await configManager.getForUser(userId, contextToken);
    if (!config.typingTicket) return;
    typingUsers.add(userId);
    try {
      await sendTyping({
        ...apiOpts,
        body: { ilink_user_id: userId, typing_ticket: config.typingTicket, status: TypingStatus.TYPING },
      });
    } catch { /* ignore */ }

    // Start keepalive if not already running
    if (!typingInterval) {
      typingInterval = setInterval(async () => {
        for (const uid of typingUsers) {
          const cfg = await configManager.getForUser(uid);
          if (!cfg.typingTicket) continue;
          try {
            await sendTyping({
              ...apiOpts,
              body: { ilink_user_id: uid, typing_ticket: cfg.typingTicket, status: TypingStatus.TYPING },
            });
          } catch { /* ignore */ }
        }
      }, TYPING_KEEPALIVE_MS);
    }
  }

  async function stopTyping(userId: string) {
    typingUsers.delete(userId);
    const config = await configManager.getForUser(userId);
    if (!config.typingTicket) return;
    try {
      await sendTyping({
        ...apiOpts,
        body: { ilink_user_id: userId, typing_ticket: config.typingTicket, status: TypingStatus.CANCEL },
      });
    } catch { /* ignore */ }

    // Stop keepalive if no more typing users
    if (typingUsers.size === 0 && typingInterval) {
      clearInterval(typingInterval);
      typingInterval = undefined;
    }
  }

  // ── Connect MCP ──

  await mcp.connect(new StdioServerTransport());
  log.info(`MCP server connected, account=${creds.accountId}`);

  // ── Start WeChat poller ──

  const controller = new AbortController();
  process.on("SIGINT", () => controller.abort());
  process.on("SIGTERM", () => controller.abort());

  await runPoller({
    apiOpts,
    accountId: creds.accountId,
    syncStorage: createFileSyncStorage(creds.accountId),
    signal: controller.signal,
    logger: noopLogger,

    async onMessage(msg: WeixinMessage) {
      const fromUserId = msg.from_user_id ?? "";
      if (!fromUserId) return;

      // Cache context token
      if (msg.context_token) {
        setContextToken(creds.accountId, fromUserId, msg.context_token);
      }

      const text = bodyFromItemList(msg.item_list);
      const media = findMediaItem(msg.item_list);

      // Build notification content
      const parts: string[] = [];
      if (text) parts.push(text);

      // Handle media: download and save to temp file
      if (media) {
        try {
          const downloaded = await downloadMediaFromItem(media.item, CDN_BASE_URL, noopLogger);
          if (downloaded) {
            const ext = getExtensionFromMime(downloaded.mimeType);
            const filename = downloaded.filename ?? `inbound-${Date.now()}${ext}`;
            const filePath = await saveTempFile(downloaded.data, filename);
            parts.push(`[Attachment: ${filePath} (${downloaded.mimeType})]`);
            log.info(`saved inbound media: ${filePath}`);
          }
        } catch (err) {
          log.error(`media download failed: ${err}`);
          parts.push("[Attachment: download failed]");
        }
      }

      if (parts.length === 0) return;

      const content = parts.join("\n");
      log.info(`inbound from=${fromUserId} text="${text.slice(0, 60)}" media=${media ? "yes" : "no"}`);

      // Start typing indicator while Claude thinks
      const ct = getContextToken(creds.accountId, fromUserId);
      if (ct) {
        startTyping(fromUserId, ct).catch(() => {});
      }

      // Push to Claude Code
      await mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content,
          meta: {
            from_user_id: fromUserId,
          },
        },
      });
    },
  }).catch((err: unknown) => {
    if (controller.signal.aborted) return;
    log.error(`poller error: ${err}`);
  });
}

main();
