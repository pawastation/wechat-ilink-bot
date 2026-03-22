import { randomUUID } from "node:crypto";

import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { redactToken } from "../util/redact.js";

const QR_LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_QR_REFRESH_COUNT = 3;

/** Default `bot_type` for ilink get_bot_qrcode / get_qrcode_status. */
export const DEFAULT_BOT_TYPE = "3";

interface QRCodeResponse {
  qrcode: string;
  qrcode_img_content: string;
}

interface StatusResponse {
  status: "wait" | "scaned" | "confirmed" | "expired";
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
}

export type LoginResult = {
  connected: boolean;
  botToken?: string;
  accountId?: string;
  baseUrl?: string;
  userId?: string;
  message: string;
};

export type QRLoginCallbacks = {
  /** Called when a new QR code is available. Render it however you like. */
  onQRCode: (qrcodeUrl: string) => void;
  /** Called when status changes (e.g. "scanned", "expired, refreshing..."). */
  onStatus?: (status: string) => void;
};

async function fetchQRCode(
  apiBaseUrl: string,
  botType: string,
  routeTag: string | undefined,
  log: Logger,
): Promise<QRCodeResponse> {
  const base = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  const url = new URL(`ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`, base);
  log.debug(`fetchQRCode: ${url.toString()}`);

  const headers: Record<string, string> = {};
  if (routeTag) headers.SKRouteTag = routeTag;

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Failed to fetch QR code: ${response.status} ${response.statusText} ${body}`);
  }
  return (await response.json()) as QRCodeResponse;
}

async function pollQRStatus(
  apiBaseUrl: string,
  qrcode: string,
  routeTag: string | undefined,
  log: Logger,
): Promise<StatusResponse> {
  const base = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  const url = new URL(`ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`, base);

  const headers: Record<string, string> = { "iLink-App-ClientVersion": "1" };
  if (routeTag) headers.SKRouteTag = routeTag;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QR_LONG_POLL_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), { headers, signal: controller.signal });
    clearTimeout(timer);
    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(`QR status poll failed: ${response.status} ${response.statusText}`);
    }
    return JSON.parse(rawText) as StatusResponse;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      log.debug(`pollQRStatus: client-side timeout, returning wait`);
      return { status: "wait" };
    }
    throw err;
  }
}

/**
 * Complete QR login flow: fetch QR → poll status → return credentials.
 *
 * Uses callbacks for QR code display and status updates, so it works in
 * any environment (terminal, web UI, headless).
 */
export async function loginWithQR(opts: {
  apiBaseUrl: string;
  callbacks: QRLoginCallbacks;
  botType?: string;
  routeTag?: string;
  timeoutMs?: number;
  logger?: Logger;
}): Promise<LoginResult> {
  const log = opts.logger ?? defaultLogger;
  const botType = opts.botType ?? DEFAULT_BOT_TYPE;
  const timeoutMs = Math.max(opts.timeoutMs ?? 480_000, 1000);

  if (!opts.apiBaseUrl) {
    return { connected: false, message: "apiBaseUrl is required" };
  }

  // Step 1: fetch QR code
  let qrResponse: QRCodeResponse;
  try {
    qrResponse = await fetchQRCode(opts.apiBaseUrl, botType, opts.routeTag, log);
    log.info(`QR code received, qrcode=${redactToken(qrResponse.qrcode)}`);
  } catch (err) {
    return { connected: false, message: `Failed to start login: ${String(err)}` };
  }

  opts.callbacks.onQRCode(qrResponse.qrcode_img_content);
  opts.callbacks.onStatus?.("请使用微信扫描二维码");

  // Step 2: poll for scan/confirmation
  const deadline = Date.now() + timeoutMs;
  let currentQR = qrResponse;
  let scannedNotified = false;
  let refreshCount = 1;

  while (Date.now() < deadline) {
    try {
      const status = await pollQRStatus(opts.apiBaseUrl, currentQR.qrcode, opts.routeTag, log);

      switch (status.status) {
        case "wait":
          break;

        case "scaned":
          if (!scannedNotified) {
            opts.callbacks.onStatus?.("已扫码，请在微信中确认");
            scannedNotified = true;
          }
          break;

        case "expired": {
          refreshCount++;
          if (refreshCount > MAX_QR_REFRESH_COUNT) {
            return { connected: false, message: "登录超时：二维码多次过期，请重新开始。" };
          }
          opts.callbacks.onStatus?.(`二维码已过期，正在刷新...(${refreshCount}/${MAX_QR_REFRESH_COUNT})`);
          try {
            currentQR = await fetchQRCode(opts.apiBaseUrl, botType, opts.routeTag, log);
            scannedNotified = false;
            opts.callbacks.onQRCode(currentQR.qrcode_img_content);
            opts.callbacks.onStatus?.("新二维码已生成，请重新扫描");
          } catch (refreshErr) {
            return { connected: false, message: `刷新二维码失败: ${String(refreshErr)}` };
          }
          break;
        }

        case "confirmed": {
          if (!status.ilink_bot_id) {
            return { connected: false, message: "登录失败：服务器未返回 ilink_bot_id。" };
          }
          log.info(`Login confirmed! ilink_bot_id=${status.ilink_bot_id}`);
          return {
            connected: true,
            botToken: status.bot_token,
            accountId: status.ilink_bot_id,
            baseUrl: status.baseurl,
            userId: status.ilink_user_id,
            message: "与微信连接成功！",
          };
        }
      }
    } catch (err) {
      return { connected: false, message: `Login failed: ${String(err)}` };
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return { connected: false, message: "登录超时，请重试。" };
}
