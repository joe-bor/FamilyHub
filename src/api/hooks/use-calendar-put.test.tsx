import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type {
  ApiResponse,
  CalendarEvent,
  CalendarEventResponse,
  UpdateEventRequest,
} from "@/lib/types";
import {
  createTestEvent,
  createUpdateRequest,
  testMembers,
  toEventResponse,
} from "@/test/fixtures";
import {
  API_BASE,
  resetMockEvents,
  seedMockEvents,
  server,
} from "@/test/mocks/server";
import { calendarKeys, useUpdateEvent } from "./use-calendar";

/**
 * Tests verifying PUT (full-replacement) semantics for calendar event updates.
 *
 * The API contract says PUT replaces the entire resource — omitted fields are
 * NOT preserved. These tests ensure the MSW mock handler faithfully implements
 * this contract and that the mutation hook sends all required fields.
 */
describe("PUT full-replacement semantics", () => {
  let testQueryClient: QueryClient;

  function createTestWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvents();
    testQueryClient.clear();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("preserves all fields when only title is changed", async () => {
    const original = createTestEvent({
      id: "event-put-1",
      title: "Original Title",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      memberId: testMembers[0].id,
      location: "Office",
      isAllDay: false,
    });
    seedMockEvents([toEventResponse(original)]);

    // Seed the query cache so optimistic update has data to work with
    testQueryClient.setQueryData(calendarKeys.eventList(), {
      data: [original],
    } satisfies ApiResponse<CalendarEvent[]>);

    // Intercept the PUT request to capture the body and respond
    let capturedBody: ({ id: string } & UpdateEventRequest) | null = null;
    server.use(
      http.put(
        `${API_BASE}/calendar/events/:id`,
        async ({ request, params }) => {
          const body = (await request.json()) as UpdateEventRequest;
          capturedBody = {
            id: params.id as string,
            ...body,
          };

          const updatedEvent: CalendarEventResponse = {
            id: params.id as string,
            title: body.title,
            startTime: body.startTime,
            endTime: body.endTime,
            date: body.date,
            memberId: body.memberId,
            isAllDay: body.isAllDay,
            location: body.location,
          };

          return HttpResponse.json({
            data: updatedEvent,
            message: "Event updated",
          });
        },
      ),
    );

    const updateRequest = createUpdateRequest(original, {
      title: "Updated Title",
    });

    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the request body contains ALL original fields
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.title).toBe("Updated Title");
    expect(capturedBody!.startTime).toBe("9:00 AM");
    expect(capturedBody!.endTime).toBe("10:00 AM");
    expect(capturedBody!.memberId).toBe(testMembers[0].id);
    expect(capturedBody!.location).toBe("Office");
    expect(capturedBody!.isAllDay).toBe(false);

    // Verify the response preserved fields
    const responseEvent = result.current.data?.data;
    expect(responseEvent?.title).toBe("Updated Title");
    expect(responseEvent?.location).toBe("Office");
    expect(responseEvent?.isAllDay).toBe(false);
  });

  it("clears location when sent as undefined (not silently preserved)", async () => {
    const original = createTestEvent({
      id: "event-put-2",
      title: "Meeting",
      location: "Conference Room B",
      isAllDay: false,
      memberId: testMembers[0].id,
    });
    seedMockEvents([toEventResponse(original)]);

    testQueryClient.setQueryData(calendarKeys.eventList(), {
      data: [original],
    } satisfies ApiResponse<CalendarEvent[]>);

    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.put(
        `${API_BASE}/calendar/events/:id`,
        async ({ request, params }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;

          // Respond with true PUT semantics: use request values directly
          const updatedEvent: CalendarEventResponse = {
            id: params.id as string,
            title: capturedBody.title as string,
            startTime: capturedBody.startTime as string,
            endTime: capturedBody.endTime as string,
            date: capturedBody.date as string,
            memberId: capturedBody.memberId as string,
            isAllDay: capturedBody.isAllDay as boolean | undefined,
            location: capturedBody.location as string | undefined,
          };

          return HttpResponse.json({
            data: updatedEvent,
            message: "Event updated",
          });
        },
      ),
    );

    // Send update with location explicitly undefined
    const updateRequest = createUpdateRequest(original, {
      location: undefined,
    });

    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The key assertion: location should NOT be "Conference Room B"
    // With true PUT semantics, the mock uses the request value (undefined), not the old value
    const responseEvent = result.current.data?.data;
    expect(responseEvent?.location).toBeUndefined();
  });

  it("preserves isAllDay=true when only title is updated", async () => {
    const original = createTestEvent({
      id: "event-put-3",
      title: "All Day Conference",
      isAllDay: true,
      memberId: testMembers[1].id,
    });
    seedMockEvents([toEventResponse(original)]);

    testQueryClient.setQueryData(calendarKeys.eventList(), {
      data: [original],
    } satisfies ApiResponse<CalendarEvent[]>);

    const updateRequest = createUpdateRequest(original, {
      title: "All Day Workshop",
    });

    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const responseEvent = result.current.data?.data;
    expect(responseEvent?.title).toBe("All Day Workshop");
    expect(responseEvent?.isAllDay).toBe(true);
  });

  it("preserves time values when only title is updated", async () => {
    const original = createTestEvent({
      id: "event-put-4",
      title: "Afternoon Session",
      startTime: "2:00 PM",
      endTime: "3:30 PM",
      memberId: testMembers[0].id,
    });
    seedMockEvents([toEventResponse(original)]);

    testQueryClient.setQueryData(calendarKeys.eventList(), {
      data: [original],
    } satisfies ApiResponse<CalendarEvent[]>);

    const updateRequest = createUpdateRequest(original, {
      title: "Extended Session",
    });

    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate(updateRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const responseEvent = result.current.data?.data;
    expect(responseEvent?.title).toBe("Extended Session");
    expect(responseEvent?.startTime).toBe("2:00 PM");
    expect(responseEvent?.endTime).toBe("3:30 PM");
  });
});
