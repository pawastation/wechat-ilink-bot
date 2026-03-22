import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  pauseSession,
  isSessionPaused,
  getRemainingPauseMs,
  assertSessionActive,
  _resetForTest,
  SESSION_EXPIRED_ERRCODE,
} from "./session-guard.js";
import { noopLogger } from "../logger.js";

describe("session-guard", () => {
  beforeEach(() => {
    _resetForTest();
    vi.restoreAllMocks();
  });

  it("is not paused initially", () => {
    expect(isSessionPaused("acc1")).toBe(false);
    expect(getRemainingPauseMs("acc1")).toBe(0);
  });

  it("pauses and reports remaining time", () => {
    pauseSession("acc1", noopLogger);
    expect(isSessionPaused("acc1")).toBe(true);
    expect(getRemainingPauseMs("acc1")).toBeGreaterThan(0);
    expect(getRemainingPauseMs("acc1")).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("isolates accounts", () => {
    pauseSession("acc1", noopLogger);
    expect(isSessionPaused("acc1")).toBe(true);
    expect(isSessionPaused("acc2")).toBe(false);
  });

  it("assertSessionActive throws when paused", () => {
    pauseSession("acc1", noopLogger);
    expect(() => assertSessionActive("acc1")).toThrow(/session paused/);
    expect(() => assertSessionActive("acc1")).toThrow(String(SESSION_EXPIRED_ERRCODE));
  });

  it("assertSessionActive does not throw when not paused", () => {
    expect(() => assertSessionActive("acc1")).not.toThrow();
  });

  it("unpauses after duration elapses", () => {
    vi.useFakeTimers();
    try {
      pauseSession("acc1", noopLogger);
      expect(isSessionPaused("acc1")).toBe(true);

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);
      expect(isSessionPaused("acc1")).toBe(false);
      expect(getRemainingPauseMs("acc1")).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
