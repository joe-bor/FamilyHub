/**
 * Configuration for read-only offline data persistence (PRD §7.5.2).
 *
 * Already-fetched read data is persisted to IndexedDB via TanStack Query
 * persistence so calendar events, chores, lists, meals, recipes, and family
 * render immediately on cold start and remain viewable offline. Writes are NOT
 * persisted or queued — see {@link ./dehydrate} (`shouldDehydrateMutation`).
 */

/**
 * How long persisted read data stays valid (24h).
 *
 * Used for BOTH the persistence `maxAge` AND the Query `gcTime`. TanStack
 * persistence requires `gcTime >= maxAge`; otherwise inactive queries are
 * garbage-collected from memory before the restored cache can rehydrate them,
 * discarding the persisted data early. Keep these in lock-step via this shared
 * constant.
 */
export const OFFLINE_READ_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * IndexedDB database + object-store names for the persisted read cache.
 *
 * A dedicated database (rather than idb-keyval's default `keyval-store`) keeps
 * the offline read cache isolated so {@link clearOfflineReadCache} can wipe it
 * wholesale on logout / 401 without touching any other IndexedDB usage.
 */
export const OFFLINE_CACHE_DB_NAME = "family-hub-offline";
export const OFFLINE_CACHE_STORE_NAME = "query-cache";

/**
 * The single idb-keyval key under which the dehydrated PersistedClient is
 * stored.
 */
export const OFFLINE_CACHE_KEY = "read-cache";
