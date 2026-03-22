import { describe, it, expect } from "vitest";
import {
  UploadMediaType,
  MessageType,
  MessageItemType,
  MessageState,
  TypingStatus,
} from "./types.js";

describe("protocol constants", () => {
  it("UploadMediaType has expected values", () => {
    expect(UploadMediaType.IMAGE).toBe(1);
    expect(UploadMediaType.VIDEO).toBe(2);
    expect(UploadMediaType.FILE).toBe(3);
    expect(UploadMediaType.VOICE).toBe(4);
  });

  it("MessageType has expected values", () => {
    expect(MessageType.USER).toBe(1);
    expect(MessageType.BOT).toBe(2);
  });

  it("MessageItemType has expected values", () => {
    expect(MessageItemType.TEXT).toBe(1);
    expect(MessageItemType.IMAGE).toBe(2);
    expect(MessageItemType.VOICE).toBe(3);
    expect(MessageItemType.FILE).toBe(4);
    expect(MessageItemType.VIDEO).toBe(5);
  });

  it("MessageState has expected values", () => {
    expect(MessageState.NEW).toBe(0);
    expect(MessageState.GENERATING).toBe(1);
    expect(MessageState.FINISH).toBe(2);
  });

  it("TypingStatus has expected values", () => {
    expect(TypingStatus.TYPING).toBe(1);
    expect(TypingStatus.CANCEL).toBe(2);
  });
});
