import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runPoller, memorySyncStorage } from "./poller.js";
import { noopLogger } from "../logger.js";

const mockFetch = vi.fn();

describe("poller", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("processes messages and saves sync buf", async () => {
    const controller = new AbortController();
    const messages: string[] = [];
    const storage = memorySyncStorage();

    // First call: return one message
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          ret: 0,
          msgs: [{ from_user_id: "user1", item_list: [{ type: 1, text_item: { text: "hi" } }] }],
          get_updates_buf: "buf-v2",
        }),
    });

    // Second call: abort
    mockFetch.mockImplementationOnce(() => {
      controller.abort();
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    try {
      await runPoller({
        apiOpts: { baseUrl: "https://example.com", token: "tok" },
        accountId: "acc1",
        onMessage: async (msg) => {
          messages.push(msg.from_user_id ?? "");
        },
        syncStorage: storage,
        signal: controller.signal,
        logger: noopLogger,
      });
    } catch {
      // aborted
    }

    expect(messages).toEqual(["user1"]);
    expect(await storage.load()).toBe("buf-v2");
  });

  it("memorySyncStorage works", async () => {
    const s = memorySyncStorage();
    expect(await s.load()).toBeUndefined();
    await s.save("test-buf");
    expect(await s.load()).toBe("test-buf");
  });
});
