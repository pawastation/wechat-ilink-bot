import { describe, it, expect } from "vitest";
import { buildCdnDownloadUrl, buildCdnUploadUrl } from "./cdn-url.js";

describe("buildCdnDownloadUrl", () => {
  it("builds correct URL with encoded param", () => {
    const url = buildCdnDownloadUrl("param=value&key=123", "https://cdn.example.com/c2c");
    expect(url).toBe("https://cdn.example.com/c2c/download?encrypted_query_param=param%3Dvalue%26key%3D123");
  });
});

describe("buildCdnUploadUrl", () => {
  it("builds correct URL with encoded params", () => {
    const url = buildCdnUploadUrl({
      cdnBaseUrl: "https://cdn.example.com/c2c",
      uploadParam: "up=1",
      filekey: "fk-abc",
    });
    expect(url).toContain("encrypted_query_param=up%3D1");
    expect(url).toContain("filekey=fk-abc");
  });
});
