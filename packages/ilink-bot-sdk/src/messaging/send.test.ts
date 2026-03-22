import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendText, sendErrorNotice } from "./send.js";
import { noopLogger } from "../logger.js";

const mockFetch = vi.fn();

describe("sendText", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  const baseOpts = {
    baseUrl: "https://ilinkai.weixin.qq.com",
    token: "tok",
    contextToken: "ctx-tok",
  };

  it("sends text message with correct structure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    const result = await sendText({
      to: "user1",
      text: "hello",
      opts: baseOpts,
      logger: noopLogger,
    });

    expect(result.messageId).toMatch(/^ilink-bot:/);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.msg.to_user_id).toBe("user1");
    expect(body.msg.context_token).toBe("ctx-tok");
    expect(body.msg.item_list[0].text_item.text).toBe("hello");
    expect(body.msg.message_type).toBe(2); // BOT
    expect(body.msg.message_state).toBe(2); // FINISH
  });

  it("throws when contextToken is missing", async () => {
    await expect(
      sendText({
        to: "user1",
        text: "hi",
        opts: { ...baseOpts, contextToken: undefined },
        logger: noopLogger,
      }),
    ).rejects.toThrow("contextToken is required");
  });
});

describe("sendErrorNotice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is no-op when contextToken is absent", async () => {
    await sendErrorNotice({
      to: "user1",
      contextToken: undefined,
      message: "error",
      opts: { baseUrl: "https://example.com", token: "tok" },
      logger: noopLogger,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends error message and does not throw on failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));

    await expect(
      sendErrorNotice({
        to: "user1",
        contextToken: "ctx",
        message: "something broke",
        opts: { baseUrl: "https://example.com", token: "tok" },
        logger: noopLogger,
      }),
    ).resolves.toBeUndefined();
  });
});
