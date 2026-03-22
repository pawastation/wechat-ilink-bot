/**
 * In-memory context token store.
 *
 * contextToken is issued per-message by the getUpdates API and must be echoed
 * verbatim in every outbound send for conversation association.
 */

const store = new Map<string, string>();

function key(accountId: string, userId: string): string {
  return `${accountId}:${userId}`;
}

/** Store a context token for a given account+user pair. */
export function setContextToken(accountId: string, userId: string, token: string): void {
  store.set(key(accountId, userId), token);
}

/** Retrieve the cached context token for a given account+user pair. */
export function getContextToken(accountId: string, userId: string): string | undefined {
  return store.get(key(accountId, userId));
}

/** @internal Reset — only for tests. */
export function _resetForTest(): void {
  store.clear();
}
