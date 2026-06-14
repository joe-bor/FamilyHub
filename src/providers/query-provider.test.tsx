import { dehydrate, QueryClient, useQuery } from "@tanstack/react-query";
import {
  type PersistedClient,
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { choreKeys } from "@/api";
import {
  createOfflineReadCache,
  type IdbKeyvalLike,
  OFFLINE_READ_CACHE_MAX_AGE_MS,
  offlineReadDehydrateOptions,
} from "@/lib/offline";
import type { ChoresBoard } from "@/lib/types";

const board: ChoresBoard = {
  timezone: "America/Los_Angeles",
  today: {
    scope: "TODAY",
    periodStartDate: "2026-01-05",
    periodEndDate: "2026-01-05",
    summary: { total: 0, completed: 0, remaining: 0 },
    assignees: [],
  },
  thisWeek: {
    scope: "THIS_WEEK",
    periodStartDate: "2026-01-05",
    periodEndDate: "2026-01-11",
    summary: { total: 0, completed: 0, remaining: 0 },
    assignees: [],
  },
  thisMonth: {
    scope: "THIS_MONTH",
    periodStartDate: "2026-01-01",
    periodEndDate: "2026-01-31",
    summary: { total: 0, completed: 0, remaining: 0 },
    assignees: [],
  },
};

function Probe() {
  const { data } = useQuery({
    queryKey: choreKeys.board(),
    // Never resolves, so anything shown must come from hydrated cache.
    queryFn: () => new Promise<{ data: ChoresBoard }>(() => {}),
  });
  return <div>tz:{data?.data?.timezone ?? "none"}</div>;
}

function seededPersistedClient(): PersistedClient {
  const source = new QueryClient();
  source.setQueryData(choreKeys.board(), { data: board });
  return {
    timestamp: Date.now(),
    buster: __APP_VERSION__,
    clientState: dehydrate(source, offlineReadDehydrateOptions),
  };
}

function fakeIdb(getImpl: () => Promise<unknown>): IdbKeyvalLike {
  return {
    createStore: vi.fn(() => ({ store: "mock" }) as never),
    get: vi.fn(getImpl) as never,
    set: vi.fn(async () => {}) as never,
    del: vi.fn(async () => {}) as never,
    clear: vi.fn(async () => {}) as never,
  };
}

function persistOptionsFor(idb: IdbKeyvalLike) {
  return {
    persister: createOfflineReadCache(idb).persister,
    maxAge: OFFLINE_READ_CACHE_MAX_AGE_MS,
    buster: __APP_VERSION__,
    dehydrateOptions: offlineReadDehydrateOptions,
  };
}

describe("PersistQueryClientProvider wiring", () => {
  it("hydrates persisted read data and seeds queries on mount", async () => {
    const idb = fakeIdb(async () => seededPersistedClient());
    const client = new QueryClient();
    render(
      <PersistQueryClientProvider
        client={client}
        persistOptions={persistOptionsFor(idb)}
      >
        <Probe />
      </PersistQueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("tz:America/Los_Angeles")).toBeInTheDocument(),
    );
  });

  it("still renders the app when IndexedDB/persistence is unavailable", async () => {
    const idb = fakeIdb(async () => {
      throw new Error("no indexedDB");
    });
    const client = new QueryClient();
    render(
      <PersistQueryClientProvider
        client={client}
        persistOptions={persistOptionsFor(idb)}
      >
        <div>app shell</div>
      </PersistQueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("app shell")).toBeInTheDocument(),
    );
  });
});
