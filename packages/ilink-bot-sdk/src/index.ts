// Types
export type {
  BaseInfo,
  GetUploadUrlReq,
  GetUploadUrlResp,
  TextItem,
  CDNMedia,
  ImageItem,
  VoiceItem,
  FileItem,
  VideoItem,
  RefMessage,
  MessageItem,
  WeixinMessage,
  GetUpdatesReq,
  GetUpdatesResp,
  SendMessageReq,
  SendMessageResp,
  SendTypingReq,
  SendTypingResp,
  GetConfigResp,
} from "./types.js";

export {
  UploadMediaType,
  MessageType,
  MessageItemType,
  MessageState,
  TypingStatus,
} from "./types.js";

// Utilities
export { generateId, tempFileName } from "./util/random.js";
export { truncate, redactToken, redactBody, redactUrl } from "./util/redact.js";
export {
  getMimeFromFilename,
  getExtensionFromMime,
  getExtensionFromContentTypeOrUrl,
} from "./util/mime.js";

// Logger
export type { Logger } from "./logger.js";
export { defaultLogger, noopLogger } from "./logger.js";

// API
export type { ApiOptions } from "./api/api.js";
export { getUpdates, getUploadUrl, sendMessage, getConfig, sendTyping } from "./api/api.js";

// API - Session guard
export {
  SESSION_EXPIRED_ERRCODE,
  pauseSession,
  isSessionPaused,
  getRemainingPauseMs,
  assertSessionActive,
} from "./api/session-guard.js";

// API - Config cache
export type { CachedConfig } from "./api/config-cache.js";
export { ConfigManager } from "./api/config-cache.js";

// CDN - AES-128-ECB
export { encryptAesEcb, decryptAesEcb, aesEcbPaddedSize } from "./cdn/aes-ecb.js";

// CDN - URL builders
export { buildCdnDownloadUrl, buildCdnUploadUrl } from "./cdn/cdn-url.js";

// CDN - Upload
export type { UploadedMediaInfo } from "./cdn/upload.js";
export { uploadImage, uploadVideo, uploadFile } from "./cdn/upload.js";

// CDN - Upload (low-level)
export { uploadBufferToCdn } from "./cdn/cdn-upload.js";

// CDN - Download
export { downloadAndDecryptBuffer, downloadPlainCdnBuffer } from "./cdn/download.js";

// Messaging - Context token
export { setContextToken, getContextToken } from "./messaging/context-token.js";

// Messaging - Inbound parsing
export { isMediaItem, bodyFromItemList, findMediaItem } from "./messaging/inbound.js";

// Messaging - Markdown
export { markdownToPlainText } from "./messaging/markdown.js";

// Messaging - Send
export type { SendOptions } from "./messaging/send.js";
export { sendText, sendImage, sendVideo, sendFileMessage, sendErrorNotice } from "./messaging/send.js";

// Messaging - Send media (high-level: upload + send)
export { sendMediaData } from "./messaging/send-media.js";

// Media - Download from message item
export type { DownloadedMedia } from "./media/download.js";
export { downloadMediaFromItem } from "./media/download.js";

// Media - SILK transcode
export { silkToWav } from "./media/silk-transcode.js";

// Polling
export type { SyncStorage, PollerOptions } from "./polling/poller.js";
export { runPoller, memorySyncStorage } from "./polling/poller.js";

// Auth - QR login
export type { LoginResult, QRLoginCallbacks } from "./auth/qr-login.js";
export { loginWithQR, DEFAULT_BOT_TYPE } from "./auth/qr-login.js";
