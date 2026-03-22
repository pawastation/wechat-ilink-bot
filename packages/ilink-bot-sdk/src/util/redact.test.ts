import { describe, it, expect } from "vitest";
import { truncate, redactToken, redactBody, redactUrl } from "./redact.js";

describe("truncate", () => {
  it("returns empty for undefined", () => {
    expect(truncate(undefined, 10)).toBe("");
  });

  it("returns full string when under max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates with length indicator", () => {
    const result = truncate("abcdefghij", 5);
    expect(result).toBe("abcde…(len=10)");
  });
});

describe("redactToken", () => {
  it("returns (none) for undefined", () => {
    expect(redactToken(undefined)).toBe("(none)");
  });

  it("masks short tokens entirely", () => {
    expect(redactToken("abc")).toBe("****(len=3)");
  });

  it("shows prefix for longer tokens", () => {
    expect(redactToken("abcdefghijklmnop")).toBe("abcdef…(len=16)");
  });
});

describe("redactBody", () => {
  it("returns (empty) for undefined", () => {
    expect(redactBody(undefined)).toBe("(empty)");
  });

  it("returns full body when short", () => {
    expect(redactBody("short")).toBe("short");
  });

  it("truncates long body", () => {
    const long = "x".repeat(300);
    const result = redactBody(long);
    expect(result).toContain("…(truncated, totalLen=300)");
    expect(result.length).toBeLessThan(300);
  });
});

describe("redactUrl", () => {
  it("strips query string", () => {
    expect(redactUrl("https://example.com/path?token=secret")).toBe(
      "https://example.com/path?<redacted>",
    );
  });

  it("keeps URL without query as-is", () => {
    expect(redactUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("handles invalid URL gracefully", () => {
    expect(redactUrl("not-a-url")).toBe("not-a-url");
  });
});
