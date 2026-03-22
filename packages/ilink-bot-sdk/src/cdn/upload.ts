import crypto from "node:crypto";

import { getUploadUrl } from "../api/api.js";
import type { ApiOptions } from "../api/api.js";
import { UploadMediaType } from "../types.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { aesEcbPaddedSize } from "./aes-ecb.js";
import { uploadBufferToCdn } from "./cdn-upload.js";

export type UploadedMediaInfo = {
  filekey: string;
  /** CDN download encrypted_query_param; use in CDNMedia.encrypt_query_param */
  downloadEncryptedQueryParam: string;
  /** AES-128-ECB key, hex-encoded; convert to base64 for CDNMedia.aes_key */
  aeskey: string;
  /** Plaintext file size in bytes */
  fileSize: number;
  /** Ciphertext file size in bytes (AES-128-ECB with PKCS7 padding) */
  fileSizeCiphertext: number;
};

/**
 * Upload media to the Weixin CDN.
 * Accepts raw data as Buffer (no filesystem dependency).
 *
 * Flow: compute MD5 → generate AES key → getUploadUrl → encrypt & upload to CDN
 */
async function uploadMediaToCdn(params: {
  data: Buffer;
  toUserId: string;
  apiOpts: ApiOptions;
  cdnBaseUrl: string;
  mediaType: (typeof UploadMediaType)[keyof typeof UploadMediaType];
  label: string;
  logger?: Logger;
}): Promise<UploadedMediaInfo> {
  const { data, toUserId, apiOpts, cdnBaseUrl, mediaType, label } = params;
  const log = params.logger ?? defaultLogger;

  const rawsize = data.length;
  const rawfilemd5 = crypto.createHash("md5").update(data).digest("hex");
  const filesize = aesEcbPaddedSize(rawsize);
  const filekey = crypto.randomBytes(16).toString("hex");
  const aeskey = crypto.randomBytes(16);

  log.debug(`${label}: rawsize=${rawsize} filesize=${filesize} md5=${rawfilemd5} filekey=${filekey}`);

  const uploadUrlResp = await getUploadUrl({
    ...apiOpts,
    filekey,
    media_type: mediaType,
    to_user_id: toUserId,
    rawsize,
    rawfilemd5,
    filesize,
    no_need_thumb: true,
    aeskey: aeskey.toString("hex"),
  });

  const uploadParam = uploadUrlResp.upload_param;
  if (!uploadParam) {
    log.error(`${label}: getUploadUrl returned no upload_param`);
    throw new Error(`${label}: getUploadUrl returned no upload_param`);
  }

  const { downloadParam: downloadEncryptedQueryParam } = await uploadBufferToCdn({
    buf: data,
    uploadParam,
    filekey,
    cdnBaseUrl,
    aeskey,
    label: `${label}[orig filekey=${filekey}]`,
    logger: log,
  });

  return {
    filekey,
    downloadEncryptedQueryParam,
    aeskey: aeskey.toString("hex"),
    fileSize: rawsize,
    fileSizeCiphertext: filesize,
  };
}

/** Upload image data to the Weixin CDN. */
export async function uploadImage(params: {
  data: Buffer;
  toUserId: string;
  apiOpts: ApiOptions;
  cdnBaseUrl: string;
  logger?: Logger;
}): Promise<UploadedMediaInfo> {
  return uploadMediaToCdn({ ...params, mediaType: UploadMediaType.IMAGE, label: "uploadImage" });
}

/** Upload video data to the Weixin CDN. */
export async function uploadVideo(params: {
  data: Buffer;
  toUserId: string;
  apiOpts: ApiOptions;
  cdnBaseUrl: string;
  logger?: Logger;
}): Promise<UploadedMediaInfo> {
  return uploadMediaToCdn({ ...params, mediaType: UploadMediaType.VIDEO, label: "uploadVideo" });
}

/** Upload file attachment data to the Weixin CDN. */
export async function uploadFile(params: {
  data: Buffer;
  toUserId: string;
  apiOpts: ApiOptions;
  cdnBaseUrl: string;
  logger?: Logger;
}): Promise<UploadedMediaInfo> {
  return uploadMediaToCdn({ ...params, mediaType: UploadMediaType.FILE, label: "uploadFile" });
}
