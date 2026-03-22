import { sendMessage as sendMessageApi } from "../api/api.js";
import type { ApiOptions } from "../api/api.js";
import type { MessageItem, SendMessageReq } from "../types.js";
import { MessageItemType, MessageState, MessageType } from "../types.js";
import type { UploadedMediaInfo } from "../cdn/upload.js";
import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";
import { generateId } from "../util/random.js";

export type SendOptions = ApiOptions & { contextToken?: string };

function generateClientId(): string {
  return generateId("ilink-bot");
}

/** Build a SendMessageReq with a single text message. */
function buildTextMessageReq(params: {
  to: string;
  text: string;
  contextToken?: string;
  clientId: string;
}): SendMessageReq {
  const { to, text, contextToken, clientId } = params;
  const item_list: MessageItem[] = text
    ? [{ type: MessageItemType.TEXT, text_item: { text } }]
    : [];
  return {
    msg: {
      from_user_id: "",
      to_user_id: to,
      client_id: clientId,
      message_type: MessageType.BOT,
      message_state: MessageState.FINISH,
      item_list: item_list.length ? item_list : undefined,
      context_token: contextToken ?? undefined,
    },
  };
}

/**
 * Send a plain text message.
 * contextToken is required for conversation association.
 */
export async function sendText(params: {
  to: string;
  text: string;
  opts: SendOptions;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { to, text, opts } = params;
  const log = params.logger ?? defaultLogger;
  if (!opts.contextToken) {
    log.error(`sendText: contextToken missing, refusing to send to=${to}`);
    throw new Error("sendText: contextToken is required");
  }
  const clientId = generateClientId();
  const req = buildTextMessageReq({ to, text, contextToken: opts.contextToken, clientId });
  await sendMessageApi({ ...opts, body: req });
  return { messageId: clientId };
}

/**
 * Send one or more MessageItems (optionally preceded by a text caption).
 * Each item is sent as its own request (item_list always has exactly one entry).
 */
async function sendMediaItems(params: {
  to: string;
  text: string;
  mediaItem: MessageItem;
  opts: SendOptions;
  label: string;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { to, text, mediaItem, opts, label } = params;
  const log = params.logger ?? defaultLogger;

  const items: MessageItem[] = [];
  if (text) {
    items.push({ type: MessageItemType.TEXT, text_item: { text } });
  }
  items.push(mediaItem);

  let lastClientId = "";
  for (const item of items) {
    lastClientId = generateClientId();
    const req: SendMessageReq = {
      msg: {
        from_user_id: "",
        to_user_id: to,
        client_id: lastClientId,
        message_type: MessageType.BOT,
        message_state: MessageState.FINISH,
        item_list: [item],
        context_token: opts.contextToken ?? undefined,
      },
    };
    try {
      await sendMessageApi({ ...opts, body: req });
    } catch (err) {
      log.error(`${label}: failed to=${to} clientId=${lastClientId} err=${String(err)}`);
      throw err;
    }
  }

  log.debug(`${label}: success to=${to} clientId=${lastClientId}`);
  return { messageId: lastClientId };
}

/** Send an image message using a previously uploaded file. */
export async function sendImage(params: {
  to: string;
  text: string;
  uploaded: UploadedMediaInfo;
  opts: SendOptions;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { to, text, uploaded, opts } = params;
  if (!opts.contextToken) {
    throw new Error("sendImage: contextToken is required");
  }
  const imageItem: MessageItem = {
    type: MessageItemType.IMAGE,
    image_item: {
      media: {
        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
        aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
        encrypt_type: 1,
      },
      mid_size: uploaded.fileSizeCiphertext,
    },
  };
  return sendMediaItems({ to, text, mediaItem: imageItem, opts, label: "sendImage", logger: params.logger });
}

/** Send a video message using a previously uploaded file. */
export async function sendVideo(params: {
  to: string;
  text: string;
  uploaded: UploadedMediaInfo;
  opts: SendOptions;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { to, text, uploaded, opts } = params;
  if (!opts.contextToken) {
    throw new Error("sendVideo: contextToken is required");
  }
  const videoItem: MessageItem = {
    type: MessageItemType.VIDEO,
    video_item: {
      media: {
        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
        aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
        encrypt_type: 1,
      },
      video_size: uploaded.fileSizeCiphertext,
    },
  };
  return sendMediaItems({ to, text, mediaItem: videoItem, opts, label: "sendVideo", logger: params.logger });
}

/** Send a file attachment using a previously uploaded file. */
export async function sendFileMessage(params: {
  to: string;
  text: string;
  fileName: string;
  uploaded: UploadedMediaInfo;
  opts: SendOptions;
  logger?: Logger;
}): Promise<{ messageId: string }> {
  const { to, text, fileName, uploaded, opts } = params;
  if (!opts.contextToken) {
    throw new Error("sendFileMessage: contextToken is required");
  }
  const fileItem: MessageItem = {
    type: MessageItemType.FILE,
    file_item: {
      media: {
        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
        aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
        encrypt_type: 1,
      },
      file_name: fileName,
      len: String(uploaded.fileSize),
    },
  };
  return sendMediaItems({ to, text, mediaItem: fileItem, opts, label: "sendFileMessage", logger: params.logger });
}

/**
 * Send a plain-text error notice back to a user.
 * Fire-and-forget: errors are logged but never thrown.
 * No-op when contextToken is absent.
 */
export async function sendErrorNotice(params: {
  to: string;
  contextToken: string | undefined;
  message: string;
  opts: ApiOptions;
  logger?: Logger;
}): Promise<void> {
  const log = params.logger ?? defaultLogger;
  if (!params.contextToken) {
    log.warn(`sendErrorNotice: no contextToken for to=${params.to}, skipping`);
    return;
  }
  try {
    await sendText({
      to: params.to,
      text: params.message,
      opts: { ...params.opts, contextToken: params.contextToken },
      logger: log,
    });
  } catch (err) {
    log.error(`sendErrorNotice failed to=${params.to}: ${String(err)}`);
  }
}
