import { MessageItemType } from "../types.js";
import type { MessageItem, WeixinMessage } from "../types.js";

/** Returns true if the message item is a media type (image, video, file, or voice). */
export function isMediaItem(item: MessageItem): boolean {
  return (
    item.type === MessageItemType.IMAGE ||
    item.type === MessageItemType.VIDEO ||
    item.type === MessageItemType.FILE ||
    item.type === MessageItemType.VOICE
  );
}

/**
 * Extract text body from a message's item_list.
 * Handles quoted messages (ref_msg) by prepending the quoted content.
 */
export function bodyFromItemList(itemList?: MessageItem[]): string {
  if (!itemList?.length) return "";
  for (const item of itemList) {
    if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
      const text = String(item.text_item.text);
      const ref = item.ref_msg;
      if (!ref) return text;
      if (ref.message_item && isMediaItem(ref.message_item)) return text;
      const parts: string[] = [];
      if (ref.title) parts.push(ref.title);
      if (ref.message_item) {
        const refBody = bodyFromItemList([ref.message_item]);
        if (refBody) parts.push(refBody);
      }
      if (!parts.length) return text;
      return `[引用: ${parts.join(" | ")}]\n${text}`;
    }
    // Voice-to-text: use transcribed text if available
    if (item.type === MessageItemType.VOICE && item.voice_item?.text) {
      return item.voice_item.text;
    }
  }
  return "";
}

/**
 * Find the first downloadable media item from a message.
 * Priority: IMAGE > VIDEO > FILE > VOICE (skips voice with transcription text).
 * Falls back to media referenced via a quoted message (ref_msg).
 */
export function findMediaItem(
  itemList?: MessageItem[],
): { item: MessageItem; isRef: boolean } | undefined {
  if (!itemList?.length) return undefined;

  const main =
    itemList.find(
      (i) => i.type === MessageItemType.IMAGE && i.image_item?.media?.encrypt_query_param,
    ) ??
    itemList.find(
      (i) => i.type === MessageItemType.VIDEO && i.video_item?.media?.encrypt_query_param,
    ) ??
    itemList.find(
      (i) => i.type === MessageItemType.FILE && i.file_item?.media?.encrypt_query_param,
    ) ??
    itemList.find(
      (i) =>
        i.type === MessageItemType.VOICE &&
        i.voice_item?.media?.encrypt_query_param &&
        !i.voice_item.text,
    );

  if (main) return { item: main, isRef: false };

  // Fallback: quoted message media
  const refItem = itemList.find(
    (i) =>
      i.type === MessageItemType.TEXT &&
      i.ref_msg?.message_item &&
      isMediaItem(i.ref_msg.message_item),
  )?.ref_msg?.message_item;

  if (refItem) return { item: refItem, isRef: true };

  return undefined;
}
