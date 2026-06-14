import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calendarKeys,
  calendarService,
  type FamilyApiResponse,
  familyKeys,
  familyService,
  listsKeys,
  listsService,
  useDeleteEvent,
  useRemoveMember,
  useUpdateListItem,
} from "@/api";
import type {
  ApiResponse,
  CalendarEvent,
  ListDetailApiResponse,
} from "@/lib/types";

/**
 * Read-only enforcement: while offline, the existing optimistic mutations must
 * NOT touch the in-memory cache (no optimistic change, no queued/persisted
 * mutation). Each case seeds the cache, goes offline, fires the mutation, and
 * asserts the cache is untouched and the network service was never called.
 */

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

// gcTime: Infinity so cache assertions survive after the mutation settles.
function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  setOnline(false);
});

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe("offline read-only enforcement", () => {
  it("calendar delete does not optimistically remove the event", async () => {
    const client = createClient();
    const params = { startDate: "2026-01-01", endDate: "2026-01-31" };
    const event: CalendarEvent = {
      id: "evt-1",
      title: "Dentist",
      startTime: "09:00",
      endTime: "10:00",
      date: new Date(2026, 0, 5),
      memberId: "m-1",
      isAllDay: false,
    };
    client.setQueryData<ApiResponse<CalendarEvent[]>>(
      calendarKeys.eventList(params),
      { data: [event] },
    );
    const deleteSpy = vi.spyOn(calendarService, "deleteEvent");

    const { result } = renderHook(() => useDeleteEvent(), {
      wrapper: wrapper(client),
    });
    result.current.mutate("evt-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(
      client.getQueryData<ApiResponse<CalendarEvent[]>>(
        calendarKeys.eventList(params),
      )?.data,
    ).toHaveLength(1);
  });

  it("family remove member does not optimistically drop the member", async () => {
    const client = createClient();
    client.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: {
        id: "fam-1",
        name: "Fam",
        createdAt: "2026-01-01T00:00:00Z",
        members: [
          { id: "m-1", name: "Alice", color: "coral" },
          { id: "m-2", name: "Bob", color: "teal" },
        ],
      },
    });
    const removeSpy = vi.spyOn(familyService, "removeMember");

    const { result } = renderHook(() => useRemoveMember(), {
      wrapper: wrapper(client),
    });
    result.current.mutate("m-2");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(removeSpy).not.toHaveBeenCalled();
    expect(
      client.getQueryData<FamilyApiResponse>(familyKeys.family())?.data
        ?.members,
    ).toHaveLength(2);
  });

  it("list item update does not optimistically toggle completion", async () => {
    const client = createClient();
    const listId = "l-1";
    const detail: ListDetailApiResponse = {
      data: {
        id: listId,
        name: "Groceries",
        kind: "grocery",
        categoryDisplayMode: "flat",
        showCompletedOverride: null,
        categories: [],
        items: [
          {
            id: "i-1",
            text: "Milk",
            completed: false,
            completedAt: null,
            categoryId: null,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    };
    client.setQueryData<ListDetailApiResponse>(
      listsKeys.detail(listId),
      detail,
    );
    const updateSpy = vi.spyOn(listsService, "updateItem");

    const { result } = renderHook(() => useUpdateListItem(listId), {
      wrapper: wrapper(client),
    });
    result.current.mutate({
      itemId: "i-1",
      request: { text: "Milk", completed: true },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(
      client.getQueryData<ListDetailApiResponse>(listsKeys.detail(listId))?.data
        .items[0].completed,
    ).toBe(false);
  });
});
