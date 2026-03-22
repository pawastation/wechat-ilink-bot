/** Minimal logger interface — consumers can inject their own implementation. */
export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/** Default logger that delegates to console. */
export const defaultLogger: Logger = {
  debug: (msg) => console.debug(`[ilink-bot-sdk] ${msg}`),
  info: (msg) => console.info(`[ilink-bot-sdk] ${msg}`),
  warn: (msg) => console.warn(`[ilink-bot-sdk] ${msg}`),
  error: (msg) => console.error(`[ilink-bot-sdk] ${msg}`),
};

/** No-op logger for suppressing all output. */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
