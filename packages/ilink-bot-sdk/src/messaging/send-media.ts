import type { ApiOptions } from "../api/api.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { getMimeFromFilename } from "../util/mime.js";
import { uploadImage, uploadVideo, uploadFile } from "../cdn/upload.js";
import { sendImage, sendVideo, sendFileMessage } from "./send.js";

/**
 * Upload media data and send it as a WeChat message, routing by MIME type:
 *   video/*  → uploadVideo  + sendVideo
 *   image/*  → uploadImage  + sendImage
 *   else     → uploadFile   + sendFileMessage
 *
 * Accepts raw Buffer data + filename (no filesystem dependency).
 */
export async function sendMediaData(params: {
  data: Buffer;
  filename: string;
  to: string;
  text: string;
  apiOpts: ApiOptions;
  contextToken: string;
  cdnBaseUrl: string;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { data, filename, to, text, apiOpts, contextToken, cdnBaseUrl } = params;
  const log = params.logger ?? defaultLogger;
  const mime = getMimeFromFilename(filename);
  const sendOpts = { ...apiOpts, contextToken };

  if (mime.startsWith("video/")) {
    log.info(`sendMediaData: uploading video filename=${filename} to=${to}`);
    const uploaded = await uploadVideo({ data, toUserId: to, apiOpts, cdnBaseUrl, logger: log });
    return sendVideo({ to, text, uploaded, opts: sendOpts, logger: log });
  }

  if (mime.startsWith("image/")) {
    log.info(`sendMediaData: uploading image filename=${filename} to=${to}`);
    const uploaded = await uploadImage({ data, toUserId: to, apiOpts, cdnBaseUrl, logger: log });
    return sendImage({ to, text, uploaded, opts: sendOpts, logger: log });
  }

  log.info(`sendMediaData: uploading file filename=${filename} to=${to}`);
  const uploaded = await uploadFile({ data, toUserId: to, apiOpts, cdnBaseUrl, logger: log });
  return sendFileMessage({ to, text, fileName: filename, uploaded, opts: sendOpts, logger: log });
}
