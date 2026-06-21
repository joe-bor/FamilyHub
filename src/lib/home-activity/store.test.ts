import { describe, expect, it, vi } from "vitest";
import { getHiddenAt, getLastSeen, setHiddenAt, setLastSeen } from "./markers";
import {
  clearHomeActivity,
  createHomeActivityStore,
  type IdbKeyvalLike,
} from "./store";
import type { ActivityState } from "./types";

function fakeIdb(): { idb: IdbKeyvalLike; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const idb: IdbKeyvalLike = {
    createStore: vi.fn(() => ({}) as never),
    get: vi.fn(async (k: IDBValidKey) => store.get(String(k)) as never),
    set: vi.fn(
      async (k: IDBValidKey, v: unknown) => void store.set(String(k), v),
    ),
    del: vi.fn(async (k: IDBValidKey) => void store.delete(String(k))),
    clear: vi.fn(async () => store.clear()),
  };
  return { idb, store };
}

const state: ActivityState = {
  snapshot: {
    "lists:l1": { storeKey: "lists:l1", module: "lists", title: "Groceries" },
  },
  log: [],
  snapshotSavedAt: 5,
  eventWindow: { start: "2026-06-21", end: "2026-07-19" },
};

describe("createHomeActivityStore", () => {
  it("round-trips state through idb", async () => {
    const { idb } = fakeIdb();
    const s = createHomeActivityStore(idb);
    await s.saveState(state);
    expect(await s.loadState()).toEqual(state);
  });

  it("returns null when nothing is stored", async () => {
    const s = createHomeActivityStore(fakeIdb().idb);
    expect(await s.loadState()).toBeNull();
  });

  it("clear wipes the store", async () => {
    const { idb } = fakeIdb();
    const s = createHomeActivityStore(idb);
    await s.saveState(state);
    await s.clear();
    expect(await s.loadState()).toBeNull();
  });

  it("save and load are no-ops when IndexedDB is unavailable", async () => {
    const brokenIdb: IdbKeyvalLike = {
      ...fakeIdb().idb,
      createStore: vi.fn(() => {
        throw new Error("no idb");
      }),
    };
    const s = createHomeActivityStore(brokenIdb);
    await expect(s.saveState(state)).resolves.toBeUndefined();
    await expect(s.loadState()).resolves.toBeNull();
  });
});

describe("clearHomeActivity (singleton)", () => {
  it("clears the localStorage markers, not only IndexedDB", async () => {
    setLastSeen(123);
    setHiddenAt(456);
    await clearHomeActivity(); // jsdom has no indexedDB → the IDB clear no-ops via the guard
    expect(getLastSeen()).toBe(0);
    expect(getHiddenAt()).toBe(0);
  });
});
