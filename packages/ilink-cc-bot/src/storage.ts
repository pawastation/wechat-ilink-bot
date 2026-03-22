import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { SyncStorage } from "@pawastation/ilink-bot-sdk";

const DATA_DIR = path.join(os.homedir(), ".wechat-ilink-bot", "cc-bot");

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export type AccountCredentials = {
  token: string;
  baseUrl: string;
  accountId: string;
};

export async function loadCredentials(): Promise<AccountCredentials | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "credentials.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveCredentials(creds: AccountCredentials): Promise<void> {
  await ensureDir(DATA_DIR);
  await fs.writeFile(
    path.join(DATA_DIR, "credentials.json"),
    JSON.stringify(creds, null, 2),
    "utf-8",
  );
}

export function createFileSyncStorage(accountId: string): SyncStorage {
  const filePath = path.join(DATA_DIR, `${accountId}.sync.json`);
  return {
    async load() {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(raw);
        return data.get_updates_buf;
      } catch {
        return undefined;
      }
    },
    async save(buf: string) {
      await ensureDir(DATA_DIR);
      await fs.writeFile(filePath, JSON.stringify({ get_updates_buf: buf }), "utf-8");
    },
  };
}

/** Temp directory for downloaded media files. */
export const MEDIA_TEMP_DIR = path.join(DATA_DIR, "media-temp");

export async function saveTempFile(data: Buffer, filename: string): Promise<string> {
  await ensureDir(MEDIA_TEMP_DIR);
  const filePath = path.join(MEDIA_TEMP_DIR, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}
