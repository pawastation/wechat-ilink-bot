import { MessageItemType } from "../types.js";
import type { MessageItem } from "../types.js";
import { downloadAndDecryptBuffer, downloadPlainCdnBuffer } from "../cdn/download.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { getMimeFromFilename } from "../util/mime.js";
import { silkToWav } from "./silk-transcode.js";

export type DownloadedMedia = {
  data: Buffer;
  /** MIME type of the downloaded media. */
  mimeType: string;
  /** Original filename (for file attachments). */
  filename?: string;
};

/**
 * Download and decrypt media from a single MessageItem.
 * Returns the decrypted buffer with MIME type, or undefined on unsupported type or failure.
 *
 * For voice messages, automatically attempts SILK → WAV transcoding if silk-wasm is available.
 */
export async function downloadMediaFromItem(
  item: MessageItem,
  cdnBaseUrl: string,
  logger?: Logger,
): Promise<DownloadedMedia | undefined> {
  const log = logger ?? defaultLogger;

  if (item.type === MessageItemType.IMAGE) {
    const img = item.image_item;
    if (!img?.media?.encrypt_query_param) return undefined;
    const aesKeyBase64 = img.aeskey
      ? Buffer.from(img.aeskey, "hex").toString("base64")
      : img.media.aes_key;
    try {
      const data = aesKeyBase64
        ? await downloadAndDecryptBuffer(img.media.encrypt_query_param, aesKeyBase64, cdnBaseUrl, "image", log)
        : await downloadPlainCdnBuffer(img.media.encrypt_query_param, cdnBaseUrl, "image-plain", log);
      // Detect actual image type from magic bytes
      let mimeType = "image/jpeg"; // default for WeChat images
      if (data[0] === 0x89 && data[1] === 0x50) mimeType = "image/png";
      else if (data[0] === 0x47 && data[1] === 0x49) mimeType = "image/gif";
      else if (data.length >= 12 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) mimeType = "image/webp";
      else if (data[0] === 0x42 && data[1] === 0x4d) mimeType = "image/bmp";
      return { data, mimeType };
    } catch (err) {
      log.error(`image download/decrypt failed: ${String(err)}`);
      return undefined;
    }
  }

  if (item.type === MessageItemType.VOICE) {
    const voice = item.voice_item;
    if (!voice?.media?.encrypt_query_param || !voice.media.aes_key) return undefined;
    try {
      const silkBuf = await downloadAndDecryptBuffer(
        voice.media.encrypt_query_param, voice.media.aes_key, cdnBaseUrl, "voice", log,
      );
      const wavBuf = await silkToWav(silkBuf, log);
      if (wavBuf) {
        return { data: wavBuf, mimeType: "audio/wav" };
      }
      return { data: silkBuf, mimeType: "audio/silk" };
    } catch (err) {
      log.error(`voice download/transcode failed: ${String(err)}`);
      return undefined;
    }
  }

  if (item.type === MessageItemType.FILE) {
    const fileItem = item.file_item;
    if (!fileItem?.media?.encrypt_query_param || !fileItem.media.aes_key) return undefined;
    try {
      const data = await downloadAndDecryptBuffer(
        fileItem.media.encrypt_query_param, fileItem.media.aes_key, cdnBaseUrl, "file", log,
      );
      const mime = getMimeFromFilename(fileItem.file_name ?? "file.bin");
      return { data, mimeType: mime, filename: fileItem.file_name ?? undefined };
    } catch (err) {
      log.error(`file download failed: ${String(err)}`);
      return undefined;
    }
  }

  if (item.type === MessageItemType.VIDEO) {
    const videoItem = item.video_item;
    if (!videoItem?.media?.encrypt_query_param || !videoItem.media.aes_key) return undefined;
    try {
      const data = await downloadAndDecryptBuffer(
        videoItem.media.encrypt_query_param, videoItem.media.aes_key, cdnBaseUrl, "video", log,
      );
      return { data, mimeType: "video/mp4" };
    } catch (err) {
      log.error(`video download failed: ${String(err)}`);
      return undefined;
    }
  }

  return undefined;
}
