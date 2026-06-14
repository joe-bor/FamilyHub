import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { clear, createStore, del, get, set, type UseStore } from "idb-keyval";
import {
  OFFLINE_CACHE_DB_NAME,
  OFFLINE_CACHE_KEY,
  OFFLINE_CACHE_STORE_NAME,
} from "./constants";
import { restorePersistedClient, sanitizePersistedClient } from "./validators";

/**
 * A small custom idb-keyval `Persister` for TanStack Query.
 *
 * We use a hand-rolled persister (rather than `createAsyncStoragePersister`,
 * which lives in a separate `@tanstack/query-async-storage-persister` package)
 * because the only new dependencies allowed for offline reads are
 * `@tanstack/react-query-persist-client` and `idb-keyval`. IndexedDB via
 * structured clone also preserves `Date` objects (calendar events) on round
 * trip — a localStorage/JSON persister would not.
 *
 * Every IndexedDB access is guarded: if IndexedDB is missing (SSR, jsdom),
 * blocked (private mode), or over quota, the persister degrades to a no-op so
 * the app keeps working online. Persistence is a best-effort enhancement.
 *
 * The idb-keyval functions are injected ({@link IdbKeyvalLike}) so tests can
 * pass an in-memory fake — module-level `vi.mock("idb-keyval")` is unreliable
 * here because setupFiles preload this module before any per-test mock runs.
 */
export interface IdbKeyvalLike {
  createStore: typeof createStore;
  get: typeof get;
  set: typeof set;
  del: typeof del;
  clear: typeof clear;
}

const defaultIdb: IdbKeyvalLike = { createStore, get, set, del, clear };

export interface OfflineReadCache {
  persister: Persister;
  clearOfflineReadCache: () => Promise<void>;
}

/**
 * Create an offline read cache bound to a given idb-keyval implementation. Each
 * instance memoises its own IndexedDB store handle, so injecting a fake yields a
 * fully isolated cache for tests.
 */
export function createOfflineReadCache(
  idb: IdbKeyvalLike = defaultIdb,
): OfflineReadCache {
  // `undefined` = not yet resolved, `null` = IndexedDB unavailable.
  let cachedStore: UseStore | null | undefined;

  function getStore(): UseStore | null {
    if (cachedStore !== undefined) return cachedStore;
    try {
      cachedStore = idb.createStore(
        OFFLINE_CACHE_DB_NAME,
        OFFLINE_CACHE_STORE_NAME,
      );
    } catch {
      cachedStore = null;
    }
    return cachedStore;
  }

  const persister: Persister = {
    persistClient: async (client: PersistedClient) => {
      const store = getStore();
      if (!store) return;
      try {
        await idb.set(
          OFFLINE_CACHE_KEY,
          sanitizePersistedClient(client),
          store,
        );
      } catch {
        // Quota exceeded / write blocked — drop persistence silently.
      }
    },
    restoreClient: async () => {
      const store = getStore();
      if (!store) return undefined;
      try {
        const raw = await idb.get<PersistedClient>(OFFLINE_CACHE_KEY, store);
        return restorePersistedClient(raw);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      const store = getStore();
      if (!store) return;
      try {
        await idb.del(OFFLINE_CACHE_KEY, store);
      } catch {
        // Ignore — nothing more we can do.
      }
    },
  };

  async function clearOfflineReadCache(): Promise<void> {
    const store = getStore();
    if (!store) return;
    try {
      await idb.clear(store);
    } catch {
      // IndexedDB unavailable/blocked — nothing persisted to leak anyway.
    }
  }

  return { persister, clearOfflineReadCache };
}

// App-wide singleton bound to the real idb-keyval. Created lazily-enough: the
// constructor only sets up closures; no IndexedDB is touched until a method is
// called, so importing this module is safe in jsdom/SSR.
const appOfflineReadCache = createOfflineReadCache();

export function createIdbPersister(): Persister {
  return appOfflineReadCache.persister;
}

/**
 * Clear the persisted offline read cache. Safe to call outside React (used by
 * `useLogout()` and the HTTP 401 handler) and never rejects — clearing the
 * per-origin IndexedDB cache before a logout/401 reload is what prevents one
 * account's data leaking into the next account's session on a shared device.
 */
export function clearOfflineReadCache(): Promise<void> {
  return appOfflineReadCache.clearOfflineReadCache();
}
