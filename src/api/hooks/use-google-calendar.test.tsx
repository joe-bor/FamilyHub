import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/test/mocks/server";
import { calendarKeys } from "./use-calendar";
import {
  googleCalendarKeys,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
} from "./use-google-calendar";

const API_BASE = "http://localhost:3000/api";
const MEMBER_ID = "member-123";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useGoogleConnectionStatus", () => {
  it("fetches connection status for a member", async () => {
    server.use(
      http.get(`${API_BASE}/google/status/${MEMBER_ID}`, () =>
        HttpResponse.json({
          data: { connected: false, calendars: [] },
          message: null,
        }),
      ),
    );

    const { result } = renderHook(() => useGoogleConnectionStatus(MEMBER_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.connected).toBe(false);
  });

  it("does not fetch when memberId is empty", () => {
    const { result } = renderHook(() => useGoogleConnectionStatus(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe("useSyncGoogleCalendar", () => {
  it("invalidates status and events on success", async () => {
    server.use(
      http.post(
        `${API_BASE}/google/sync/${MEMBER_ID}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Seed cache
    queryClient.setQueryData(googleCalendarKeys.status(MEMBER_ID), {
      data: { connected: true, calendars: [] },
    });
    queryClient.setQueryData(calendarKeys.events(), { data: [] });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSyncGoogleCalendar(), {
      wrapper,
    });

    result.current.mutate(MEMBER_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify cache was invalidated
    expect(
      queryClient.getQueryState(googleCalendarKeys.status(MEMBER_ID))
        ?.isInvalidated,
    ).toBe(true);
  });
});
