import crypto from "node:crypto";

import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { redactBody, redactUrl } from "../util/redact.js";

import type {
  BaseInfo,
  GetUploadUrlReq,
  GetUploadUrlResp,
  GetUpdatesReq,
  GetUpdatesResp,
  SendMessageReq,
  SendTypingReq,
  GetConfigResp,
} from "../types.js";

export type ApiOptions = {
  baseUrl: string;
  token?: string;
  /** Optional version string included in base_info. */
  version?: string;
  /** Optional route tag sent as SKRouteTag header. */
  routeTag?: string;
  timeoutMs?: number;
  longPollTimeoutMs?: number;
  logger?: Logger;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const DEFAULT_API_TIMEOUT_MS = 15_000;
const DEFAULT_CONFIG_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBaseInfo(version?: string): BaseInfo {
  return { channel_version: version ?? "ilink-bot-sdk" };
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/** X-WECHAT-UIN header: random uint32 → decimal string → base64. */
function randomWechatUin(): string {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), "utf-8").toString("base64");
}

function buildHeaders(opts: {
  token?: string;
  routeTag?: string;
  body: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    "Content-Length": String(Buffer.byteLength(opts.body, "utf-8")),
    "X-WECHAT-UIN": randomWechatUin(),
  };
  if (opts.token?.trim()) {
    headers.Authorization = `Bearer ${opts.token.trim()}`;
  }
  if (opts.routeTag) {
    headers.SKRouteTag = opts.routeTag;
  }
  return headers;
}

/**
 * Common fetch wrapper: POST JSON to a Weixin API endpoint with timeout + abort.
 */
async function apiFetch(params: {
  baseUrl: string;
  endpoint: string;
  body: string;
  token?: string;
  routeTag?: string;
  timeoutMs: number;
  label: string;
  log: Logger;
}): Promise<string> {
  const base = ensureTrailingSlash(params.baseUrl);
  const url = new URL(params.endpoint, base);
  const hdrs = buildHeaders({
    token: params.token,
    routeTag: params.routeTag,
    body: params.body,
  });
  params.log.debug(`POST ${redactUrl(url.toString())} body=${redactBody(params.body)}`);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: hdrs,
      body: params.body,
      signal: controller.signal,
    });
    clearTimeout(t);
    const rawText = await res.text();
    params.log.debug(`${params.label} status=${res.status} raw=${redactBody(rawText)}`);
    if (!res.ok) {
      throw new Error(`${params.label} ${res.status}: ${rawText}`);
    }
    return rawText;
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Long-poll getUpdates. Server holds the request until new messages or timeout.
 * On client-side timeout, returns an empty response with ret=0.
 */
export async function getUpdates(
  params: GetUpdatesReq & ApiOptions,
): Promise<GetUpdatesResp> {
  const log = params.logger ?? defaultLogger;
  const timeout = params.longPollTimeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
  try {
    const rawText = await apiFetch({
      baseUrl: params.baseUrl,
      endpoint: "ilink/bot/getupdates",
      body: JSON.stringify({
        get_updates_buf: params.get_updates_buf ?? "",
        base_info: buildBaseInfo(params.version),
      }),
      token: params.token,
      routeTag: params.routeTag,
      timeoutMs: timeout,
      label: "getUpdates",
      log,
    });
    return JSON.parse(rawText) as GetUpdatesResp;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      log.debug(`getUpdates: client-side timeout after ${timeout}ms, returning empty response`);
      return { ret: 0, msgs: [], get_updates_buf: params.get_updates_buf };
    }
    throw err;
  }
}

/** Get a pre-signed CDN upload URL for a file. */
export async function getUploadUrl(
  params: GetUploadUrlReq & ApiOptions,
): Promise<GetUploadUrlResp> {
  const log = params.logger ?? defaultLogger;
  const rawText = await apiFetch({
    baseUrl: params.baseUrl,
    endpoint: "ilink/bot/getuploadurl",
    body: JSON.stringify({
      filekey: params.filekey,
      media_type: params.media_type,
      to_user_id: params.to_user_id,
      rawsize: params.rawsize,
      rawfilemd5: params.rawfilemd5,
      filesize: params.filesize,
      thumb_rawsize: params.thumb_rawsize,
      thumb_rawfilemd5: params.thumb_rawfilemd5,
      thumb_filesize: params.thumb_filesize,
      no_need_thumb: params.no_need_thumb,
      aeskey: params.aeskey,
      base_info: buildBaseInfo(params.version),
    }),
    token: params.token,
    routeTag: params.routeTag,
    timeoutMs: params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    label: "getUploadUrl",
    log,
  });
  return JSON.parse(rawText) as GetUploadUrlResp;
}

/** Send a single message downstream. */
export async function sendMessage(
  params: ApiOptions & { body: SendMessageReq },
): Promise<void> {
  const log = params.logger ?? defaultLogger;
  await apiFetch({
    baseUrl: params.baseUrl,
    endpoint: "ilink/bot/sendmessage",
    body: JSON.stringify({ ...params.body, base_info: buildBaseInfo(params.version) }),
    token: params.token,
    routeTag: params.routeTag,
    timeoutMs: params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    label: "sendMessage",
    log,
  });
}

/** Fetch bot config (includes typing_ticket) for a given user. */
export async function getConfig(
  params: ApiOptions & { ilinkUserId: string; contextToken?: string },
): Promise<GetConfigResp> {
  const log = params.logger ?? defaultLogger;
  const rawText = await apiFetch({
    baseUrl: params.baseUrl,
    endpoint: "ilink/bot/getconfig",
    body: JSON.stringify({
      ilink_user_id: params.ilinkUserId,
      context_token: params.contextToken,
      base_info: buildBaseInfo(params.version),
    }),
    token: params.token,
    routeTag: params.routeTag,
    timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
    label: "getConfig",
    log,
  });
  return JSON.parse(rawText) as GetConfigResp;
}

/** Send a typing indicator to a user. */
export async function sendTyping(
  params: ApiOptions & { body: SendTypingReq },
): Promise<void> {
  const log = params.logger ?? defaultLogger;
  await apiFetch({
    baseUrl: params.baseUrl,
    endpoint: "ilink/bot/sendtyping",
    body: JSON.stringify({ ...params.body, base_info: buildBaseInfo(params.version) }),
    token: params.token,
    routeTag: params.routeTag,
    timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
    label: "sendTyping",
    log,
  });
}
