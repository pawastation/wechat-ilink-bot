import { getConfig } from "./api.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";

/** Subset of getConfig fields that we cache. */
export interface CachedConfig {
  typingTicket: string;
}

const CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CONFIG_CACHE_INITIAL_RETRY_MS = 2_000;
const CONFIG_CACHE_MAX_RETRY_MS = 60 * 60 * 1000;

interface ConfigCacheEntry {
  config: CachedConfig;
  everSucceeded: boolean;
  nextFetchAt: number;
  retryDelayMs: number;
}

/**
 * Per-user getConfig cache with periodic random refresh (within 24h) and
 * exponential-backoff retry (up to 1h) on failure.
 */
export class ConfigManager {
  private cache = new Map<string, ConfigCacheEntry>();
  private log: Logger;

  constructor(
    private apiOpts: { baseUrl: string; token?: string; routeTag?: string; version?: string },
    logger?: Logger,
  ) {
    this.log = logger ?? defaultLogger;
  }

  async getForUser(userId: string, contextToken?: string): Promise<CachedConfig> {
    const now = Date.now();
    const entry = this.cache.get(userId);
    const shouldFetch = !entry || now >= entry.nextFetchAt;

    if (shouldFetch) {
      let fetchOk = false;
      try {
        const resp = await getConfig({
          baseUrl: this.apiOpts.baseUrl,
          token: this.apiOpts.token,
          routeTag: this.apiOpts.routeTag,
          version: this.apiOpts.version,
          ilinkUserId: userId,
          contextToken,
        });
        if (resp.ret === 0) {
          this.cache.set(userId, {
            config: { typingTicket: resp.typing_ticket ?? "" },
            everSucceeded: true,
            nextFetchAt: now + Math.random() * CONFIG_CACHE_TTL_MS,
            retryDelayMs: CONFIG_CACHE_INITIAL_RETRY_MS,
          });
          this.log.info(
            `config ${entry?.everSucceeded ? "refreshed" : "cached"} for ${userId}`,
          );
          fetchOk = true;
        }
      } catch (err) {
        this.log.warn(`getConfig failed for ${userId} (ignored): ${String(err)}`);
      }
      if (!fetchOk) {
        const prevDelay = entry?.retryDelayMs ?? CONFIG_CACHE_INITIAL_RETRY_MS;
        const nextDelay = Math.min(prevDelay * 2, CONFIG_CACHE_MAX_RETRY_MS);
        if (entry) {
          entry.nextFetchAt = now + nextDelay;
          entry.retryDelayMs = nextDelay;
        } else {
          this.cache.set(userId, {
            config: { typingTicket: "" },
            everSucceeded: false,
            nextFetchAt: now + CONFIG_CACHE_INITIAL_RETRY_MS,
            retryDelayMs: CONFIG_CACHE_INITIAL_RETRY_MS,
          });
        }
      }
    }

    return this.cache.get(userId)?.config ?? { typingTicket: "" };
  }
}
