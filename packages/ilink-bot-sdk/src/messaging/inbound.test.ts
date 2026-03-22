import { describe, it, expect } from "vitest";
import { bodyFromItemList, isMediaItem, findMediaItem } from "./inbound.js";
import { MessageItemType } from "../types.js";
import type { MessageItem } from "../types.js";

describe("isMediaItem", () => {
  it("returns true for media types", () => {
    expect(isMediaItem({ type: MessageItemType.IMAGE })).toBe(true);
    expect(isMediaItem({ type: MessageItemType.VIDEO })).toBe(true);
    expect(isMediaItem({ type: MessageItemType.FILE })).toBe(true);
    expect(isMediaItem({ type: MessageItemType.VOICE })).toBe(true);
  });

  it("returns false for text", () => {
    expect(isMediaItem({ type: MessageItemType.TEXT })).toBe(false);
  });
});

describe("bodyFromItemList", () => {
  it("returns empty for undefined/empty", () => {
    expect(bodyFromItemList(undefined)).toBe("");
    expect(bodyFromItemList([])).toBe("");
  });

  it("extracts text from TEXT item", () => {
    const items: MessageItem[] = [
      { type: MessageItemType.TEXT, text_item: { text: "hello" } },
    ];
    expect(bodyFromItemList(items)).toBe("hello");
  });

  it("extracts voice-to-text", () => {
    const items: MessageItem[] = [
      { type: MessageItemType.VOICE, voice_item: { text: "transcribed" } },
    ];
    expect(bodyFromItemList(items)).toBe("transcribed");
  });

  it("includes quoted text context", () => {
    const items: MessageItem[] = [
      {
        type: MessageItemType.TEXT,
        text_item: { text: "reply" },
        ref_msg: {
          title: "quoted summary",
          message_item: { type: MessageItemType.TEXT, text_item: { text: "original" } },
        },
      },
    ];
    const body = bodyFromItemList(items);
    expect(body).toContain("引用");
    expect(body).toContain("quoted summary");
    expect(body).toContain("reply");
  });

  it("skips quoted media content (returns text only)", () => {
    const items: MessageItem[] = [
      {
        type: MessageItemType.TEXT,
        text_item: { text: "look at this" },
        ref_msg: {
          message_item: { type: MessageItemType.IMAGE },
        },
      },
    ];
    expect(bodyFromItemList(items)).toBe("look at this");
  });
});

describe("findMediaItem", () => {
  it("returns undefined for no media", () => {
    const items: MessageItem[] = [
      { type: MessageItemType.TEXT, text_item: { text: "hi" } },
    ];
    expect(findMediaItem(items)).toBeUndefined();
  });

  it("finds image with encrypt_query_param", () => {
    const items: MessageItem[] = [
      {
        type: MessageItemType.IMAGE,
        image_item: { media: { encrypt_query_param: "param123" } },
      },
    ];
    const result = findMediaItem(items);
    expect(result).toBeDefined();
    expect(result!.item.type).toBe(MessageItemType.IMAGE);
    expect(result!.isRef).toBe(false);
  });

  it("prefers image over file", () => {
    const items: MessageItem[] = [
      { type: MessageItemType.FILE, file_item: { media: { encrypt_query_param: "f" } } },
      { type: MessageItemType.IMAGE, image_item: { media: { encrypt_query_param: "i" } } },
    ];
    expect(findMediaItem(items)!.item.type).toBe(MessageItemType.IMAGE);
  });

  it("finds ref media as fallback", () => {
    const items: MessageItem[] = [
      {
        type: MessageItemType.TEXT,
        text_item: { text: "check this" },
        ref_msg: {
          message_item: {
            type: MessageItemType.IMAGE,
            image_item: { media: { encrypt_query_param: "ref-param" } },
          },
        },
      },
    ];
    const result = findMediaItem(items);
    expect(result).toBeDefined();
    expect(result!.isRef).toBe(true);
    expect(result!.item.type).toBe(MessageItemType.IMAGE);
  });
});
