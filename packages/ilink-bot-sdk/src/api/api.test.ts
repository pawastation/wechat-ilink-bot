import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUpdates, sendMessage, getConfig, sendTyping, getUploadUrl } from "./api.js";
import { noopLogger } from "../logger.js";

// Mock fetch globally
const mockFetch = vi.fn();

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseOpts = {
    baseUrl: "https://ilinkai.weixin.qq.com",
    token: "test-token",
    logger: noopLogger,
  };

  describe("getUpdates", () => {
    it("sends correct request and parses response", async () => {
      const mockResp = { ret: 0, msgs: [{ from_user_id: "user1" }], get_updates_buf: "buf123" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResp),
      });

      const result = await getUpdates({ ...baseOpts, get_updates_buf: "prev-buf" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("ilink/bot/getupdates");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({ get_updates_buf: "prev-buf" });
      expect(init.headers.Authorization).toBe("Bearer test-token");
      expect(init.headers.AuthorizationType).toBe("ilink_bot_token");
      expect(result).toMatchObject(mockResp);
    });

    it("returns empty response on client-side timeout", async () => {
      mockFetch.mockImplementationOnce(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      const result = await getUpdates({ ...baseOpts, get_updates_buf: "buf", longPollTimeoutMs: 100 });
      expect(result).toMatchObject({ ret: 0, msgs: [], get_updates_buf: "buf" });
    });
  });

  describe("sendMessage", () => {
    it("sends message with correct body", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

      await sendMessage({
        ...baseOpts,
        body: { msg: { to_user_id: "user1", item_list: [{ type: 1, text_item: { text: "hi" } }] } },
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.msg.to_user_id).toBe("user1");
    });
  });

  describe("getConfig", () => {
    it("sends userId and parses typing_ticket", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ret: 0, typing_ticket: "ticket123" }),
      });

      const result = await getConfig({ ...baseOpts, ilinkUserId: "user1" });
      expect(result.typing_ticket).toBe("ticket123");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.ilink_user_id).toBe("user1");
    });
  });

  describe("sendTyping", () => {
    it("sends typing status", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

      await sendTyping({
        ...baseOpts,
        body: { ilink_user_id: "user1", typing_ticket: "t", status: 1 },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.ilink_user_id).toBe("user1");
      expect(body.status).toBe(1);
    });
  });

  describe("getUploadUrl", () => {
    it("sends file params and returns upload_param", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ upload_param: "enc-param" }),
      });

      const result = await getUploadUrl({
        ...baseOpts,
        filekey: "fk1",
        media_type: 1,
        to_user_id: "user1",
        rawsize: 100,
        rawfilemd5: "abc",
        filesize: 112,
      });

      expect(result.upload_param).toBe("enc-param");
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.filekey).toBe("fk1");
      expect(body.media_type).toBe(1);
    });
  });

  describe("headers", () => {
    it("includes routeTag when provided", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

      await sendMessage({
        ...baseOpts,
        routeTag: "42",
        body: { msg: { to_user_id: "u1" } },
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.SKRouteTag).toBe("42");
    });

    it("omits routeTag when not provided", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

      await sendMessage({ ...baseOpts, body: { msg: { to_user_id: "u1" } } });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.SKRouteTag).toBeUndefined();
    });

    it("includes version in base_info", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

      await sendMessage({
        ...baseOpts,
        version: "1.2.3",
        body: { msg: { to_user_id: "u1" } },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.base_info.channel_version).toBe("1.2.3");
    });
  });
});
