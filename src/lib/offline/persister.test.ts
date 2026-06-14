import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { describe, expect, it, vi } from "vitest";
import { familyKeys } from "@/api";
import { createOfflineReadCache, type IdbKeyvalLike } from "./persister";

/**
 * Build a fake idb-keyval. Dependency injection (rather than
 * `vi.mock("idb-keyval")`) keeps these tests isolated: the persister module is
 * preloaded by setup.ts, so a module mock would not reliably rebind it.
 */
function fakeIdb(overrides: Partial<IdbKeyvalLike> = {}): {
  idb: IdbKeyvalLike;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  createStore: ReturnType<typeof vi.fn>;
} {
  const set = vi.fn(async () => {});
  const get = vi.fn(async () => undefined);
  const del = vi.fn(async () => {});
  const clear = vi.fn(async () => {});
  const createStore = vi.fn(() => ({ store: "mock" }) as never);
  const idb = {
    createStore,
    get,
    set,
    del,
    clear,
    ...overrides,
  } as IdbKeyvalLike;
  return { idb, set, get, del, clear, createStore };
}

function persistedClient(
  queries: Array<{ queryKey: readonly unknown[]; data: unknown }>,
): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: "0.0.0-test",
    clientState: {
      mutations: [],
      queries: queries.map((q) => ({
        queryKey: q.queryKey,
        queryHash: JSON.stringify(q.queryKey),
        state: { data: q.data, status: "success" },
      })),
    },
  } as unknown as PersistedClient;
}

describe("createOfflineReadCache persister", () => {
  it("sanitizes and writes the client on persist", async () => {
    const { idb, set } = fakeIdb();
    const { persister } = createOfflineReadCache(idb);

    await persister.persistClient(
      persistedClient([
        {
          queryKey: familyKeys.family(),
          data: {
            data: {
              id: "f1",
              name: "Fam",
              createdAt: "2026-01-01T00:00:00Z",
              members: [
                {
                  id: "m1",
                  name: "A",
                  color: "coral",
                  avatarUrl: "data:image/png;base64,AAAA",
                },
              ],
            },
          },
        },
      ]),
    );

    expect(set).toHaveBeenCalledTimes(1);
    const written = set.mock.calls[0][1] as PersistedClient;
    const member = (
      written.clientState.queries[0].state.data as {
        data: { members: Array<{ avatarUrl?: string }> };
      }
    ).data.members[0];
    expect(member.avatarUrl).toBeUndefined();
  });

  it("validates and filters on restore", async () => {
    const restoredRaw = persistedClient([
      {
        queryKey: familyKeys.family(),
        data: {
          data: {
            id: "f1",
            name: "Fam",
            createdAt: "2026-01-01T00:00:00Z",
            members: [],
          },
        },
      },
      { queryKey: ["chores", "board"], data: { data: { broken: true } } },
    ]);
    const { idb } = fakeIdb({ get: vi.fn(async () => restoredRaw) as never });
    const { persister } = createOfflineReadCache(idb);

    const restored = await persister.restoreClient();

    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0].queryKey[0]).toBe("family");
  });

  it("removes the client on removeClient", async () => {
    const { idb, del } = fakeIdb();
    const { persister } = createOfflineReadCache(idb);
    await persister.removeClient();
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("degrades gracefully when IndexedDB is unavailable", async () => {
    const { idb, set, get } = fakeIdb({
      createStore: vi.fn(() => {
        throw new Error("no indexedDB");
      }) as never,
    });
    const { persister, clearOfflineReadCache } = createOfflineReadCache(idb);

    await expect(
      persister.persistClient(persistedClient([])),
    ).resolves.toBeUndefined();
    await expect(persister.restoreClient()).resolves.toBeUndefined();
    await expect(persister.removeClient()).resolves.toBeUndefined();
    await expect(clearOfflineReadCache()).resolves.toBeUndefined();
    expect(set).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("degrades gracefully when a write rejects", async () => {
    const { idb } = fakeIdb({
      set: vi.fn(async () => {
        throw new Error("quota");
      }) as never,
    });
    const { persister } = createOfflineReadCache(idb);
    await expect(
      persister.persistClient(persistedClient([])),
    ).resolves.toBeUndefined();
  });
});

describe("clearOfflineReadCache", () => {
  it("clears the dedicated idb-keyval store", async () => {
    const { idb, clear } = fakeIdb();
    const { clearOfflineReadCache } = createOfflineReadCache(idb);
    await clearOfflineReadCache();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("never rejects when clear() rejects", async () => {
    const { idb } = fakeIdb({
      clear: vi.fn(async () => {
        throw new Error("boom");
      }) as never,
    });
    const { clearOfflineReadCache } = createOfflineReadCache(idb);
    await expect(clearOfflineReadCache()).resolves.toBeUndefined();
  });
});
