import { ApiErrorCode, ApiException } from "@/api/client/api-error";

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

/**
 * Thrown by {@link assertOnlineForWrite} when a write is attempted offline.
 *
 * Extends {@link ApiException} (code `NETWORK_ERROR`, status 0) so it matches
 * the `onError?: (error: ApiException) => void` shape every mutation hook
 * exposes — consumers reading `error.status`/`error.code` get sane values
 * instead of `undefined`, and `ApiException.isApiException` returns true. Use
 * {@link isOfflineWriteError} to detect this specific case for user messaging.
 */
export class OfflineWriteError extends ApiException {
  constructor() {
    super({
      code: ApiErrorCode.NETWORK_ERROR,
      message: "You're offline — changes can't be saved until you reconnect.",
      status: 0,
    });
    this.name = "OfflineWriteError";
  }
}

/** Whether an error is the offline write rejection from {@link assertOnlineForWrite}. */
export function isOfflineWriteError(
  error: unknown,
): error is OfflineWriteError {
  return error instanceof OfflineWriteError;
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
