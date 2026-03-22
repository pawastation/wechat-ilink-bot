import { getUpdates } from "../api/api.js";
import type { ApiOptions } from "../api/api.js";
import { SESSION_EXPIRED_ERRCODE, pauseSession, getRemainingPauseMs } from "../api/session-guard.js";
import type { WeixinMessage } from "../types.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;

/** Default: skip messages older than 5 minutes. */
const DEFAULT_MAX_MESSAGE_AGE_MS = 5 * 60_000;
/** Default: if a single getUpdates returns more than this many messages, skip all (cursor reset protection). */
const DEFAULT_MAX_BATCH_SIZE = 50;

/** Storage interface for persisting the sync cursor across restarts. */
export interface SyncStorage {
  load(): Promise<string | undefined>;
  save(buf: string): Promise<void>;
}

/** In-memory SyncStorage (no persistence across restarts). */
export const memorySyncStorage = (): SyncStorage => {
  let buf: string | undefined;
  return {
    load: async () => buf,
    save: async (v) => { buf = v; },
  };
};

export type PollerOptions = {
  apiOpts: ApiOptions;
  accountId: string;
  /** Called for each inbound message. */
  onMessage: (msg: WeixinMessage) => Promise<void> | void;
  /** Optional sync cursor storage. Defaults to in-memory (no persistence). */
  syncStorage?: SyncStorage;
  /** Optional callback on each successful poll cycle. */
  onPoll?: () => void;
  /** Abort signal to stop the poller. */
  signal?: AbortSignal;
  longPollTimeoutMs?: number;
  /**
   * Skip messages older than this many milliseconds.
   * Protects against processing stale messages after cursor drift.
   * Set to 0 to disable. Default: 5 minutes.
   */
  maxMessageAgeMs?: number;
  /**
   * If a single getUpdates returns more messages than this,
   * skip all messages and only advance the cursor.
   * Protects against cursor reset causing a flood of historical messages.
   * Set to 0 to disable. Default: 50.
   */
  maxBatchSize?: number;
  logger?: Logger;
};

/**
 * Long-poll loop: getUpdates → process messages → repeat.
 * Handles retry backoff, session expiry pause, sync cursor persistence,
 * and protection against stale/flooded messages.
 */
export async function runPoller(opts: PollerOptions): Promise<void> {
  const log = opts.logger ?? defaultLogger;
  const syncStorage = opts.syncStorage ?? memorySyncStorage();
  const { apiOpts, accountId, onMessage, signal } = opts;
  const maxMessageAgeMs = opts.maxMessageAgeMs ?? DEFAULT_MAX_MESSAGE_AGE_MS;
  const maxBatchSize = opts.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;

  const previousBuf = await syncStorage.load();
  let getUpdatesBuf = previousBuf ?? "";

  if (previousBuf) {
    log.info(`poller: resuming from previous sync buf (${getUpdatesBuf.length} bytes)`);
  } else {
    log.info(`poller: starting fresh (no previous sync buf)`);
  }

  let nextTimeoutMs = opts.longPollTimeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
  let consecutiveFailures = 0;

  while (!signal?.aborted) {
    try {
      const resp = await getUpdates({
        ...apiOpts,
        get_updates_buf: getUpdatesBuf,
        longPollTimeoutMs: nextTimeoutMs,
      });

      if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) {
        nextTimeoutMs = resp.longpolling_timeout_ms;
      }

      const isApiError =
        (resp.ret !== undefined && resp.ret !== 0) ||
        (resp.errcode !== undefined && resp.errcode !== 0);

      if (isApiError) {
        const isSessionExpired =
          resp.errcode === SESSION_EXPIRED_ERRCODE || resp.ret === SESSION_EXPIRED_ERRCODE;

        if (isSessionExpired) {
          pauseSession(accountId, log);
          const pauseMs = getRemainingPauseMs(accountId);
          log.error(`poller: session expired, pausing for ${Math.ceil(pauseMs / 60_000)} min`);
          consecutiveFailures = 0;
          await sleep(pauseMs, signal);
          continue;
        }

        consecutiveFailures++;
        log.error(
          `poller: getUpdates failed ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? ""} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`,
        );

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          log.error(`poller: ${MAX_CONSECUTIVE_FAILURES} consecutive failures, backing off 30s`);
          consecutiveFailures = 0;
          await sleep(BACKOFF_DELAY_MS, signal);
        } else {
          await sleep(RETRY_DELAY_MS, signal);
        }
        continue;
      }

      consecutiveFailures = 0;
      opts.onPoll?.();

      // Save cursor before processing messages — even if we skip messages,
      // the cursor advances so we don't re-fetch them.
      if (resp.get_updates_buf != null && resp.get_updates_buf !== "") {
        await syncStorage.save(resp.get_updates_buf);
        getUpdatesBuf = resp.get_updates_buf;
      }

      const msgs = resp.msgs ?? [];

      // Batch size protection: if too many messages arrive at once,
      // likely a cursor reset — skip all, cursor already saved above.
      if (maxBatchSize > 0 && msgs.length > maxBatchSize) {
        log.warn(
          `poller: batch too large (${msgs.length} > ${maxBatchSize}), skipping all messages, cursor advanced`,
        );
        continue;
      }

      const now = Date.now();
      for (const msg of msgs) {
        // Age protection: skip stale messages
        if (maxMessageAgeMs > 0 && msg.create_time_ms) {
          const ageMs = now - msg.create_time_ms;
          if (ageMs > maxMessageAgeMs) {
            log.info(
              `poller: skipping stale message seq=${msg.seq} age=${Math.round(ageMs / 1000)}s from=${msg.from_user_id}`,
            );
            continue;
          }
        }

        try {
          await onMessage(msg);
        } catch (err) {
          log.error(`poller: onMessage error from=${msg.from_user_id}: ${String(err)}`);
        }
      }
    } catch (err) {
      if (signal?.aborted) return;

      consecutiveFailures++;
      log.error(`poller: getUpdates error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${String(err)}`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        consecutiveFailures = 0;
        await sleep(BACKOFF_DELAY_MS, signal);
      } else {
        await sleep(RETRY_DELAY_MS, signal);
      }
    }
  }

  log.info("poller: stopped");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}
