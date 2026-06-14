import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { OFFLINE_READ_CACHE_MAX_AGE_MS } from "./constants";
import { offlineReadDehydrateOptions } from "./dehydrate";
import { createIdbPersister } from "./persister";

export { OFFLINE_READ_CACHE_MAX_AGE_MS } from "./constants";
export {
  isOfflineReadQueryKey,
  offlineReadDehydrateOptions,
  shouldDehydrateOfflineReadQuery,
} from "./dehydrate";
export {
  clearOfflineReadCache,
  createIdbPersister,
  createOfflineReadCache,
  type IdbKeyvalLike,
  type OfflineReadCache,
} from "./persister";
export {
  restorePersistedClient,
  sanitizePersistedClient,
  validatePersistedQueryData,
} from "./validators";

/** The `persistOptions` prop accepted by `PersistQueryClientProvider`. */
type OfflinePersistOptions = Omit<PersistQueryClientOptions, "queryClient">;

/**
 * Build the `persistOptions` for `PersistQueryClientProvider`:
 *
 * - `maxAge` = {@link OFFLINE_READ_CACHE_MAX_AGE_MS} (24h), matched by Query
 *   `gcTime` so restored data is not GC'd early.
 * - `buster` = `__APP_VERSION__` so a new app version invalidates the old cache.
 * - `dehydrateOptions` = the read allowlist + `shouldDehydrateMutation: false`.
 */
export function buildOfflinePersistOptions(): OfflinePersistOptions {
  return {
    persister: createIdbPersister(),
    maxAge: OFFLINE_READ_CACHE_MAX_AGE_MS,
    buster: __APP_VERSION__,
    dehydrateOptions: offlineReadDehydrateOptions,
  };
}
