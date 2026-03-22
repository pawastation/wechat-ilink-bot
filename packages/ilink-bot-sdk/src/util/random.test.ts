import { describe, it, expect } from "vitest";
import { generateId, tempFileName } from "./random.js";

describe("generateId", () => {
  it("has correct format: prefix:timestamp-hex", () => {
    const id = generateId("test");
    expect(id).toMatch(/^test:\d+-[0-9a-f]{8}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId("u")));
    expect(ids.size).toBe(100);
  });
});

describe("tempFileName", () => {
  it("has correct format: prefix-timestamp-hex.ext", () => {
    const name = tempFileName("img", ".png");
    expect(name).toMatch(/^img-\d+-[0-9a-f]{8}\.png$/);
  });

  it("handles empty extension", () => {
    const name = tempFileName("file", "");
    expect(name).toMatch(/^file-\d+-[0-9a-f]{8}$/);
  });
});
