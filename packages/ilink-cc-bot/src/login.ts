/**
 * QR code login for Claude Code WeChat channel.
 * Usage: pnpm --filter ilink-cc-bot login
 */
import { loginWithQR } from "@pawastation/ilink-bot-sdk";
import { saveCredentials, loadCredentials } from "./storage.js";

const BASE_URL = process.env.ILINK_BASE_URL || "https://ilinkai.weixin.qq.com";

async function main() {
  const existing = await loadCredentials();
  if (existing) {
    console.log(`Already logged in as: ${existing.accountId}`);
    console.log("Re-scanning will replace the existing credentials.\n");
  }

  console.log("Starting WeChat iLink Bot login for Claude Code...\n");

  const result = await loginWithQR({
    apiBaseUrl: BASE_URL,
    callbacks: {
      onQRCode: async (qrcodeUrl) => {
        try {
          const qrterm = await import("qrcode-terminal");
          qrterm.default.generate(qrcodeUrl, { small: true }, (qr: string) => {
            console.log(qr);
          });
        } catch {
          console.log(`QR Code URL: ${qrcodeUrl}`);
        }
      },
      onStatus: (status) => {
        console.log(`[status] ${status}`);
      },
    },
  });

  console.log(`\n${result.message}`);

  if (result.connected && result.botToken && result.accountId) {
    const normalizedId = result.accountId.replace(/[@.]/g, "-");
    await saveCredentials({
      token: result.botToken,
      baseUrl: result.baseUrl || BASE_URL,
      accountId: normalizedId,
    });
    console.log(`\nCredentials saved for: ${normalizedId}`);
    console.log(`\nRun 'npx @pawastation/ilink-cc-bot setup' to see .mcp.json configuration.`);
  } else {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Login failed:", err);
  process.exit(1);
});
