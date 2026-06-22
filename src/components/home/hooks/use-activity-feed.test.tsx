import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityState } from "@/lib/home-activity/types";
import type { CalendarEvent, ListSummary } from "@/lib/types";
import { useActivityFeed } from "./use-activity-feed";

let events: CalendarEvent[] = [];
let lists: ListSummary[] = [];
let querySettled = true; // toggle to exercise the "not yet loaded" gate
// Stable refetch spies (the mock factory re-runs per render, so inline vi.fn()s
// would not be assertable across renders).
const eventsRefetch = vi.fn(async () => ({ data: { data: events } }));
const listsRefetch = vi.fn(async () => ({ data: { data: lists } }));

vi.mock("@/api", () => ({
  useCalendarEvents: () => ({
    data: querySettled ? { data: events } : undefined,
    isSuccess: querySettled,
    refetch: eventsRefetch,
  }),
  useLists: () => ({
    data: querySettled ? { data: lists } : undefined,
    isSuccess: querySettled,
    refetch: listsRefetch,
  }),
}));

beforeEach(() => {
  eventsRefetch.mockClear();
  listsRefetch.mockClear();
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useActivityFeed", () => {
  it("surfaces a newly-seen list change as a feed group", async () => {
    querySettled = true;
    events = [];
    lists = [
      {
        id: "l1",
        name: "Groceries",
        kind: "grocery",
        totalItems: 0,
        completedItems: 0,
      },
    ];
    const io = makeMemoryIo(); // seeds an empty prior snapshot so the list reads as 'added'
    const { result } = renderHook(
      () => useActivityFeed({ io, nowProvider: () => 1000 }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.feed.groups.length).toBeGreaterThan(0),
    );
    expect(result.current.feed.groups[0].summary).toContain("Groceries");
  });

  it("does not snapshot or diff while a source query is unsettled", async () => {
    querySettled = false; // queries still loading
    events = [];
    lists = [
      {
        id: "l1",
        name: "Groceries",
        kind: "grocery",
        totalItems: 0,
        completedItems: 0,
      },
    ];
    const io = makeMemoryIo();
    const { result } = renderHook(
      () => useActivityFeed({ io, nowProvider: () => 1000 }),
      { wrapper },
    );
    // No "added" dump from partial data; saveState is never called with a fresh snapshot.
    await waitFor(() => expect(io.loadState).toHaveBeenCalled());
    expect(result.current.feed.groups).toHaveLength(0);
    expect(io.saveState).not.toHaveBeenCalled();
  });
});

describe("useActivityFeed — orchestration", () => {
  it("does NOT advance the divider on a background data-change cycle", async () => {
    querySettled = true;
    events = [];
    lists = [
      {
        id: "l1",
        name: "Groceries",
        kind: "grocery",
        totalItems: 0,
        completedItems: 0,
      },
    ];
    const io = makeMemoryIo();
    const now = vi.fn(() => 1000);
    const { rerender } = renderHook(
      () => useActivityFeed({ io, nowProvider: now }),
      { wrapper },
    );
    await waitFor(() => expect(io.saveState).toHaveBeenCalledTimes(1)); // cold-start open
    const seenAfterOpen = io.getLastSeen(); // advanced to 1000 by the open
    // A later data change (auto cycle) must refresh the log but not advance the marker.
    now.mockReturnValue(5000);
    lists = [
      ...lists,
      {
        id: "l2",
        name: "Camping",
        kind: "to-do",
        totalItems: 1,
        completedItems: 0,
      },
    ];
    rerender();
    await waitFor(() => expect(io.saveState).toHaveBeenCalledTimes(2));
    expect(io.getLastSeen()).toBe(seenAfterOpen); // divider baseline did not move
  });

  it("keeps the rendered divider baseline frozen across background cycles", async () => {
    querySettled = true;
    events = [];
    lists = [
      {
        id: "l1",
        name: "Earlier",
        kind: "to-do",
        totalItems: 0,
        completedItems: 0,
      },
      {
        id: "l2",
        name: "New",
        kind: "to-do",
        totalItems: 0,
        completedItems: 0,
      },
    ];
    const initial: ActivityState = {
      snapshot: {
        "lists:l1": {
          storeKey: "lists:l1",
          module: "lists",
          title: "Earlier",
          totalItems: 0,
          completedItems: 0,
          entityId: "l1",
        },
        "lists:l2": {
          storeKey: "lists:l2",
          module: "lists",
          title: "New",
          totalItems: 0,
          completedItems: 0,
          entityId: "l2",
        },
      },
      log: [
        {
          storeKey: "lists:l1",
          module: "lists",
          kind: "edited",
          title: "Earlier",
          detail: "+1 items",
          detectedAt: 100,
          entityId: "l1",
        },
        {
          storeKey: "lists:l2",
          module: "lists",
          kind: "edited",
          title: "New",
          detail: "+1 items",
          detectedAt: 300,
          entityId: "l2",
        },
      ],
      snapshotSavedAt: 500,
      eventWindow: { start: "2000-01-01", end: "2100-01-01" },
    };
    const io = makeMemoryIo(initial, 200);
    const now = vi.fn(() => 1000);
    const { result, rerender } = renderHook(
      () => useActivityFeed({ io, nowProvider: now }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.feed.dividerAfter).toBe(0));

    // Add another new group on an automatic cycle. The original "New" row must
    // remain above the divider; rereading the advanced lastSeen would move it below.
    now.mockReturnValue(2000);
    lists = [
      ...lists,
      {
        id: "l3",
        name: "Newest",
        kind: "to-do",
        totalItems: 1,
        completedItems: 0,
      },
    ];
    rerender();
    await waitFor(() => expect(result.current.feed.groups).toHaveLength(3));
    expect(result.current.feed.dividerAfter).toBe(1);
  });

  it("refetches BOTH sources before detecting and incorporates refreshed data", async () => {
    querySettled = true;
    events = [];
    lists = [];
    const io = makeMemoryIo();
    const { result, rerender } = renderHook(
      () => useActivityFeed({ io, nowProvider: () => 1000 }),
      { wrapper },
    );
    await waitFor(() => expect(io.loadState).toHaveBeenCalled());
    lists = [
      {
        id: "l1",
        name: "Refetched",
        kind: "to-do",
        totalItems: 1,
        completedItems: 0,
      },
    ];
    let releaseRefetch = () => {};
    const refetchGate = new Promise<void>((resolve) => {
      releaseRefetch = resolve;
    });
    eventsRefetch.mockImplementationOnce(async () => {
      await refetchGate;
      return { data: { data: events } };
    });
    listsRefetch.mockImplementationOnce(async () => {
      await refetchGate;
      return { data: { data: lists } };
    });
    // jsdom visibilityState defaults to "visible" → the listener takes the visible branch.
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(eventsRefetch).toHaveBeenCalledTimes(1));
    expect(listsRefetch).toHaveBeenCalledTimes(1);
    expect(io.loadState).toHaveBeenCalledTimes(1); // detection is blocked on BOTH refetches
    releaseRefetch();
    await waitFor(() => expect(io.loadState).toHaveBeenCalledTimes(2));
    expect(eventsRefetch.mock.invocationCallOrder[0]).toBeLessThan(
      io.loadState.mock.invocationCallOrder[1],
    );
    expect(listsRefetch.mock.invocationCallOrder[0]).toBeLessThan(
      io.loadState.mock.invocationCallOrder[1],
    );

    // The mock query hooks expose the refetched arrays on the next observer render,
    // matching TanStack Query's post-refetch notification.
    rerender();
    await waitFor(() =>
      expect(result.current.feed.groups[0]?.summary).toContain("Refetched"),
    );
  });

  it("serializes writes: a slow earlier save cannot overwrite a newer cycle", async () => {
    querySettled = true;
    events = [];
    lists = [
      { id: "l1", name: "A", kind: "to-do", totalItems: 0, completedItems: 0 },
    ];
    let state: ActivityState | null = {
      snapshot: {},
      log: [],
      snapshotSavedAt: 0,
      eventWindow: { start: "2000-01-01", end: "2100-01-01" },
    };
    const completed: number[] = [];
    let call = 0;
    const io = {
      loadState: vi.fn(async () => state),
      saveState: vi.fn(async (s: ActivityState) => {
        const n = ++call;
        if (n === 1) await new Promise((r) => setTimeout(r, 50)); // make the FIRST save slow
        state = s;
        completed.push(n);
      }),
      getLastSeen: () => 0,
      setLastSeen: () => {},
      getHiddenAt: () => 0,
      setHiddenAt: () => {},
    };
    const now = vi.fn(() => 1000);
    const { rerender } = renderHook(
      () => useActivityFeed({ io, nowProvider: now }),
      { wrapper },
    );
    // Queue a second cycle with newer data while the first save is still pending.
    now.mockReturnValue(2000);
    lists = [
      { id: "l1", name: "A", kind: "to-do", totalItems: 5, completedItems: 0 },
    ];
    rerender();
    await waitFor(() => expect(completed).toEqual([1, 2])); // mutex preserved order despite the slow save
    expect(state?.snapshot["lists:l1"]?.totalItems).toBe(5); // newest state is final, not overwritten
  });
});

// minimal in-memory IO double for the hook's injected dependencies
function makeMemoryIo(
  initialState: ActivityState | null = {
    snapshot: {},
    log: [],
    snapshotSavedAt: 0,
    eventWindow: { start: "2000-01-01", end: "2100-01-01" },
  },
  initialLastSeen = 0,
) {
  let state = initialState;
  let lastSeen = initialLastSeen;
  let hiddenAt = 0;
  return {
    loadState: vi.fn(async () => state),
    saveState: vi.fn(async (s: ActivityState) => {
      state = s;
    }),
    getLastSeen: () => lastSeen,
    setLastSeen: (v: number) => {
      lastSeen = v;
    },
    getHiddenAt: () => hiddenAt,
    setHiddenAt: (v: number) => {
      hiddenAt = v;
    },
  };
}
