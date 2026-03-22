import { describe, it, expect, beforeEach } from "vitest";
import { setContextToken, getContextToken, _resetForTest } from "./context-token.js";

describe("context-token store", () => {
  beforeEach(() => _resetForTest());

  it("returns undefined for unknown pair", () => {
    expect(getContextToken("acc1", "user1")).toBeUndefined();
  });

  it("stores and retrieves token", () => {
    setContextToken("acc1", "user1", "tok-abc");
    expect(getContextToken("acc1", "user1")).toBe("tok-abc");
  });

  it("isolates by account", () => {
    setContextToken("acc1", "user1", "tok-1");
    setContextToken("acc2", "user1", "tok-2");
    expect(getContextToken("acc1", "user1")).toBe("tok-1");
    expect(getContextToken("acc2", "user1")).toBe("tok-2");
  });

  it("overwrites previous token", () => {
    setContextToken("acc1", "user1", "tok-old");
    setContextToken("acc1", "user1", "tok-new");
    expect(getContextToken("acc1", "user1")).toBe("tok-new");
  });
});
