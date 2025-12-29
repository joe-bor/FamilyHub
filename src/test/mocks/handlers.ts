import { HttpResponse, http } from "msw";
import { parseLocalDate } from "@/lib/time-utils";
import type {
  ApiResponse,
  CalendarEvent,
  CreateEventRequest,
  MutationResponse,
  UpdateEventRequest,
} from "@/lib/types";

// In-memory storage for mock calendar events (reset between tests)
let mockEvents: CalendarEvent[] = [];

/**
 * Reset mock data between tests
 */
export function resetMockEvents(): void {
  mockEvents = [];
}

/**
 * Seed mock events for testing
 */
export function seedMockEvents(events: CalendarEvent[]): void {
  mockEvents = [...events];
}

/**
 * Get current mock events (for assertions)
 */
export function getMockEvents(): CalendarEvent[] {
  return [...mockEvents];
}

function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    },
  };
}

function createMutationResponse<T>(
  data: T,
  message: string,
): MutationResponse<T> {
  return { data, message };
}

// Base URL for API endpoints
// Note: Service endpoints start with "/" which makes them absolute paths from the origin
// So /calendar/events with baseUrl http://localhost:3000/api becomes http://localhost:3000/calendar/events
export const API_BASE = "http://localhost:3000";

/**
 * MSW request handlers for calendar API endpoints.
 *
 * Usage in tests:
 * ```typescript
 * import { server, seedMockEvents, resetMockEvents } from "@/test/mocks/server";
 *
 * beforeEach(() => {
 *   seedMockEvents([testEvent]);
 * });
 *
 * afterEach(() => {
 *   resetMockEvents();
 * });
 * ```
 *
 * Override handlers for error scenarios:
 * ```typescript
 * server.use(
 *   http.get("http://localhost:3000/calendar/events", () => {
 *     return HttpResponse.json({ message: "Server error" }, { status: 500 });
 *   })
 * );
 * ```
 */
export const handlers = [
  // GET /calendar/events - List events with optional filters
  http.get(`${API_BASE}/calendar/events`, ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const memberId = url.searchParams.get("memberId");

    let events = [...mockEvents];

    // Apply date range filter (use parseLocalDate for consistent timezone handling)
    if (startDate) {
      const start = parseLocalDate(startDate);
      events = events.filter((e) => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = parseLocalDate(endDate);
      events = events.filter((e) => new Date(e.date) <= end);
    }

    // Apply member filter
    if (memberId) {
      events = events.filter((e) => e.memberId === memberId);
    }

    return HttpResponse.json(createApiResponse(events));
  }),

  // GET /calendar/events/:id - Get single event
  http.get(`${API_BASE}/calendar/events/:id`, ({ params }) => {
    const { id } = params;
    const event = mockEvents.find((e) => e.id === id);

    if (!event) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    return HttpResponse.json(createApiResponse(event));
  }),

  // POST /calendar/events - Create new event
  http.post(`${API_BASE}/calendar/events`, async ({ request }) => {
    const body = (await request.json()) as CreateEventRequest;

    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      date: parseLocalDate(body.date), // Use parseLocalDate to avoid timezone issues
      memberId: body.memberId,
      isAllDay: body.isAllDay,
      location: body.location,
    };

    mockEvents = [...mockEvents, newEvent];

    return HttpResponse.json(
      createMutationResponse(newEvent, "Event created successfully"),
    );
  }),

  // PATCH /calendar/events/:id - Update event
  http.patch(`${API_BASE}/calendar/events/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Omit<UpdateEventRequest, "id">;

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    const existingEvent = mockEvents[index];
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      title: body.title ?? existingEvent.title,
      startTime: body.startTime ?? existingEvent.startTime,
      endTime: body.endTime ?? existingEvent.endTime,
      date: body.date ? parseLocalDate(body.date) : existingEvent.date,
      memberId: body.memberId ?? existingEvent.memberId,
      isAllDay: body.isAllDay ?? existingEvent.isAllDay,
      location: body.location ?? existingEvent.location,
    };

    mockEvents = [
      ...mockEvents.slice(0, index),
      updatedEvent,
      ...mockEvents.slice(index + 1),
    ];

    return HttpResponse.json(
      createMutationResponse(updatedEvent, "Event updated successfully"),
    );
  }),

  // DELETE /calendar/events/:id - Delete event
  http.delete(`${API_BASE}/calendar/events/:id`, ({ params }) => {
    const { id } = params;

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    mockEvents = mockEvents.filter((e) => e.id !== id);

    return new HttpResponse(null, { status: 204 });
  }),
];
