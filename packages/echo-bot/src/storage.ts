import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { SyncStorage } from "@pawastation/ilink-bot-sdk";

const DATA_DIR = path.join(os.homedir(), ".wechat-ilink-bot", "echo-bot");
const ACCOUNTS_DIR = path.join(DATA_DIR, "accounts");

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export type AccountCredentials = {
  token: string;
  baseUrl: string;
  accountId: string;
};

/** Load credentials for a specific account. */
export async function loadAccount(accountId: string): Promise<AccountCredentials | null> {
  try {
    const raw = await fs.readFile(path.join(ACCOUNTS_DIR, `${accountId}.json`), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save credentials for an account. */
export async function saveAccount(creds: AccountCredentials): Promise<void> {
  await ensureDir(ACCOUNTS_DIR);
  await fs.writeFile(
    path.join(ACCOUNTS_DIR, `${creds.accountId}.json`),
    JSON.stringify(creds, null, 2),
    "utf-8",
  );
}

/** List all saved account IDs. */
export async function listAccountIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(ACCOUNTS_DIR);
    return files
      .filter((f) => f.endsWith(".json") && !f.endsWith(".sync.json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

/** Load all saved account credentials. */
export async function loadAllAccounts(): Promise<AccountCredentials[]> {
  const ids = await listAccountIds();
  const accounts: AccountCredentials[] = [];
  for (const id of ids) {
    const creds = await loadAccount(id);
    if (creds) accounts.push(creds);
  }
  return accounts;
}

/** File-based SyncStorage implementation. */
export function createFileSyncStorage(accountId: string): SyncStorage {
  const filePath = path.join(ACCOUNTS_DIR, `${accountId}.sync.json`);
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
      await ensureDir(ACCOUNTS_DIR);
      await fs.writeFile(filePath, JSON.stringify({ get_updates_buf: buf }), "utf-8");
    },
  };
}
