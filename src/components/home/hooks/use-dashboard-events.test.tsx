import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTestEventResponse, testMembers } from "@/test/fixtures";
import {
  resetMockEvents,
  seedMockEvents,
  setupMswServer,
} from "@/test/mocks/server";
import { useDashboardEvents } from "./use-dashboard-events";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useDashboardEvents", () => {
  const currentDate = new Date(2026, 3, 25, 9, 0, 0, 0);

  setupMswServer();

  afterEach(() => {
    resetMockEvents();
  });

  it("partitions one events query into today and coming-up slices, including overlapping multi-day events", async () => {
    seedMockEvents([
      createTestEventResponse({
        id: "today-all-day",
        title: "Vacation",
        date: "2026-04-24",
        endDate: "2026-04-25",
        startTime: "12:00 AM",
        endTime: "11:59 PM",
        memberId: testMembers[0].id,
        isAllDay: true,
      }),
      createTestEventResponse({
        id: "today-timed",
        title: "School pickup",
        date: "2026-04-25",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
        memberId: testMembers[0].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "tomorrow-early",
        title: "Dentist",
        date: "2026-04-26",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: testMembers[1].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "tomorrow-late",
        title: "Swim",
        date: "2026-04-26",
        startTime: "4:00 PM",
        endTime: "5:00 PM",
        memberId: testMembers[0].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "day-after",
        title: "Brunch",
        date: "2026-04-27",
        startTime: "8:00 AM",
        endTime: "9:00 AM",
        memberId: testMembers[2].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "fourth-upcoming",
        title: "Should be capped away",
        date: "2026-04-27",
        startTime: "12:00 PM",
        endTime: "1:00 PM",
        memberId: testMembers[2].id,
        isAllDay: false,
      }),
    ]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      },
    });

    const { result } = renderHook(() => useDashboardEvents({ currentDate }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.today.map((event) => event.id)).toEqual([
      "today-all-day",
      "today-timed",
    ]);
    expect(result.current.comingUp.map((event) => event.id)).toEqual([
      "tomorrow-early",
      "tomorrow-late",
      "day-after",
    ]);
  });

  it("applies a single member focus consistently to today and coming up", async () => {
    seedMockEvents([
      createTestEventResponse({
        id: "today-a",
        date: "2026-04-25",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        memberId: testMembers[0].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "today-b",
        date: "2026-04-25",
        startTime: "1:00 PM",
        endTime: "2:00 PM",
        memberId: testMembers[1].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "tomorrow-a",
        date: "2026-04-26",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: testMembers[0].id,
        isAllDay: false,
      }),
      createTestEventResponse({
        id: "tomorrow-b",
        date: "2026-04-26",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
        memberId: testMembers[1].id,
        isAllDay: false,
      }),
    ]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      },
    });

    const { result } = renderHook(
      () =>
        useDashboardEvents({
          currentDate,
          memberFocusId: testMembers[0].id,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.today.map((event) => event.id)).toEqual(["today-a"]);
    expect(result.current.comingUp.map((event) => event.id)).toEqual([
      "tomorrow-a",
    ]);
  });
});
