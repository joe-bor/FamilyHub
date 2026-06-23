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

  it("exposes the unfiltered source events for deep-link resolution", async () => {
    querySettled = true;
    events = [
      {
        id: "e1",
        title: "Dentist",
        date: new Date(2026, 5, 23),
      } as CalendarEvent,
    ];
    lists = [];
    const io = makeMemoryIo();
    const { result } = renderHook(
      () => useActivityFeed({ io, nowProvider: () => 1000 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0].id).toBe("e1");
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
    const { result } = renderHook(
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
    // The visible cycle loads + diffs the REFETCHED arrays directly (threaded in via
    // the refetch return), so the change surfaces in this open cycle — no extra
    // render needed. Surfacing it can also kick a harmless follow-up auto cycle, so
    // assert "at least twice" rather than an exact loadState count.
    await waitFor(() =>
      expect(result.current.feed.groups[0]?.summary).toContain("Refetched"),
    );
    expect(io.loadState.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Both refetches resolved BEFORE the visible cycle's loadState (the 2nd call).
    expect(eventsRefetch.mock.invocationCallOrder[0]).toBeLessThan(
      io.loadState.mock.invocationCallOrder[1],
    );
    expect(listsRefetch.mock.invocationCallOrder[0]).toBeLessThan(
      io.loadState.mock.invocationCallOrder[1],
    );
  });

  it("diffs the REFETCHED data in the visible cycle, not the pre-refetch closure", async () => {
    // Regression guard for the divider off-by-one: the visibility handler awaits
    // refetch but the hook has not re-rendered, so a `detect("visible")` that read
    // the closure would diff STALE data — finding nothing, yet advancing lastSeen —
    // and the change would only surface (stamped LATER) on a follow-up auto cycle,
    // reading as "new" for an extra meaningful open. The fix threads the refetch
    // result into the cycle. Here the visible cycle is deliberately NON-meaningful
    // (never hidden, same day), so there is NO meaningfulOpenId bump and therefore
    // NO follow-up re-render/auto cycle — the change can ONLY appear if the visible
    // cycle itself diffed the refetched arrays.
    querySettled = true;
    events = [];
    lists = [];
    const io = makeMemoryIo();
    const { result } = renderHook(
      () => useActivityFeed({ io, nowProvider: () => 1000 }),
      { wrapper },
    );
    await waitFor(() => expect(io.loadState).toHaveBeenCalled());
    // A change lands on the server after cold start; only refetch can see it.
    lists = [
      {
        id: "l1",
        name: "Refetched",
        kind: "to-do",
        totalItems: 1,
        completedItems: 0,
      },
    ];
    // jsdom visibilityState defaults to "visible" → the listener takes the visible
    // branch. No rerender() — the refetch return value is the only fresh source.
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() =>
      expect(result.current.feed.groups[0]?.summary).toContain("Refetched"),
    );
    // Stamped at THIS open's ts (1000), so it will not re-flag on the next open.
    expect(result.current.feed.groups[0]?.newest).toBe(1000);
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

  it("records hiddenAt when the document becomes hidden", async () => {
    querySettled = true;
    events = [];
    lists = [];
    const io = makeMemoryIo();
    renderHook(() => useActivityFeed({ io, nowProvider: () => 7777 }), {
      wrapper,
    });
    // let the cold-start cycle settle so the listener is registered
    await waitFor(() => expect(io.loadState).toHaveBeenCalled());

    const original = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );
    try {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      // hide branch is synchronous: io.setHiddenAt(now()) → 7777
      expect(io.getHiddenAt()).toBe(7777);
    } finally {
      if (original) {
        Object.defineProperty(document, "visibilityState", original);
      } else {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "visible",
        });
      }
    }
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
