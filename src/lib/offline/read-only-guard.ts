/**
 * Read-only enforcement for offline mode.
 *
 * Option C ships offline READS only. Once cached data renders offline, the
 * existing optimistic mutations (complete chore, edit/delete event, list item
 * changes, …) could otherwise mutate the in-memory cache from `onMutate`
 * without ever reaching the server — an accidental offline write / implicit
 * outbox. Calling {@link assertOnlineForWrite} at the very top of those
 * `onMutate` handlers makes the mutation fail fast offline BEFORE any
 * `setQueryData`, so no optimistic local change, queued mutation, or persisted
 * mutation is created.
 */
export class OfflineWriteError extends Error {
  constructor() {
    super("You're offline — changes can't be saved until you reconnect.");
    this.name = "OfflineWriteError";
  }
}

/**
 * Throw {@link OfflineWriteError} when the browser is offline. Unknown
 * connectivity (`navigator.onLine` undefined) is treated as online so writes
 * are never blocked spuriously.
 */
export function assertOnlineForWrite(): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new OfflineWriteError();
  }
}
