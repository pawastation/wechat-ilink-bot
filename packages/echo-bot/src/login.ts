/**
 * QR code login flow. Each login creates a new account entry.
 * Usage: pnpm --filter echo-bot login
 */
import { loginWithQR } from "@pawastation/ilink-bot-sdk";
import { saveAccount, listAccountIds } from "./storage.js";

const BASE_URL = process.env.ILINK_BASE_URL || "https://ilinkai.weixin.qq.com";

async function main() {
  const existingIds = await listAccountIds();
  if (existingIds.length > 0) {
    console.log(`Already logged in accounts: ${existingIds.join(", ")}`);
    console.log("Scanning a new QR code will add another account.\n");
  }

  console.log("Starting WeChat iLink Bot login...\n");

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
    // Normalize accountId for safe filenames (e.g. "hex@im.bot" → "hex-im-bot")
    const normalizedId = result.accountId.replace(/[@.]/g, "-");
    await saveAccount({
      token: result.botToken,
      baseUrl: result.baseUrl || BASE_URL,
      accountId: normalizedId,
    });
    console.log(`Account saved: ${normalizedId}`);
    console.log(`Run 'pnpm --filter echo-bot start' to start all bots.`);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});
