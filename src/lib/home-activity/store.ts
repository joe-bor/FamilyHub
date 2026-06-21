// Persists the home-activity snapshot + log to a dedicated IndexedDB database.
// Mirrors the DI/guard shape of lib/offline/persister.ts — see that file for the
// rationale behind injecting idb-keyval (setupFiles preload makes module-level
// vi.mock unreliable). This store uses its OWN database (see ACTIVITY_DB_NAME).
import { clear, createStore, del, get, set, type UseStore } from "idb-keyval";
import {
  ACTIVITY_DB_NAME,
  ACTIVITY_STATE_KEY,
  ACTIVITY_STORE_NAME,
  HIDDEN_AT_KEY,
  LAST_SEEN_KEY,
} from "./constants";
import type { ActivityState } from "./types";

export interface IdbKeyvalLike {
  createStore: typeof createStore;
  get: typeof get;
  set: typeof set;
  del: typeof del;
  clear: typeof clear;
}

const defaultIdb: IdbKeyvalLike = { createStore, get, set, del, clear };

export interface HomeActivityStore {
  loadState: () => Promise<ActivityState | null>;
  saveState: (state: ActivityState) => Promise<void>;
  clear: () => Promise<void>;
}

/** Create a home-activity store bound to the given idb-keyval implementation.
 * Each instance memoises its own store handle, so injecting a fake yields a fully
 * isolated store for tests. */
export function createHomeActivityStore(
  idb: IdbKeyvalLike = defaultIdb,
): HomeActivityStore {
  let cached: UseStore | null | undefined;
  function getStore(): UseStore | null {
    if (cached !== undefined) return cached;
    try {
      cached = idb.createStore(ACTIVITY_DB_NAME, ACTIVITY_STORE_NAME);
    } catch {
      cached = null;
    }
    return cached;
  }

  return {
    async loadState() {
      const s = getStore();
      if (!s) return null;
      try {
        return (await idb.get<ActivityState>(ACTIVITY_STATE_KEY, s)) ?? null;
      } catch {
        return null;
      }
    },
    async saveState(state) {
      const s = getStore();
      if (!s) return;
      try {
        await idb.set(ACTIVITY_STATE_KEY, state, s);
      } catch {
        // quota/blocked — best-effort
      }
    },
    async clear() {
      const s = getStore();
      if (!s) return;
      try {
        await idb.clear(s);
      } catch {
        // nothing to leak if unavailable
      }
    },
  };
}

const appStore = createHomeActivityStore();
export const loadActivityState = () => appStore.loadState();
export const saveActivityState = (state: ActivityState) =>
  appStore.saveState(state);

/** Wipe ALL persisted activity — the IndexedDB store AND both localStorage markers.
 * Called from useLogout() and handleUnauthorized(); never rejects. Neither caller
 * does a blanket localStorage.clear(), so clearing the markers here is what stops
 * one account's divider baseline (lastSeen/hiddenAt) leaking to the next account on
 * a shared device (spec §9). */
export const clearHomeActivity = async (): Promise<void> => {
  await appStore.clear(); // IndexedDB snapshot + log
  try {
    localStorage.removeItem(LAST_SEEN_KEY);
    localStorage.removeItem(HIDDEN_AT_KEY);
  } catch {
    // storage unavailable (private mode / webview) — nothing persisted to leak
  }
};
