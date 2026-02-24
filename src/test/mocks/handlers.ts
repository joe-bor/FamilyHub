import { HttpResponse, http } from "msw";
import { parseLocalDate } from "@/lib/time-utils";
import type {
  AddMemberRequest,
  ApiResponse,
  CalendarEventResponse,
  CreateEventRequest,
  FamilyData,
  FamilyMember,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateEventRequest,
  UpdateFamilyRequest,
  UpdateMemberRequest,
  UsernameCheckResponse,
} from "@/lib/types";

// In-memory storage for mock calendar events (reset between tests)
// Uses CalendarEventResponse (string dates) to match real API wire format
let mockEvents: CalendarEventResponse[] = [];

// In-memory storage for mock family data (reset between tests)
let mockFamily: FamilyData | null = null;

// In-memory storage for mock users (reset between tests)
interface MockUser {
  username: string;
  password: string;
  familyId: string;
}
let mockUsers: MockUser[] = [];

/**
 * Reset mock data between tests
 */
export function resetMockEvents(): void {
  mockEvents = [];
}

/**
 * Seed mock events for testing.
 * Accepts CalendarEventResponse (string dates) to match real API wire format.
 */
export function seedMockEvents(events: CalendarEventResponse[]): void {
  mockEvents = [...events];
}

/**
 * Get current mock events (for assertions)
 */
export function getMockEvents(): CalendarEventResponse[] {
  return [...mockEvents];
}

/**
 * Reset mock family data between tests
 */
export function resetMockFamily(): void {
  mockFamily = null;
}

/**
 * Reset mock users between tests
 */
export function resetMockUsers(): void {
  mockUsers = [];
}

/**
 * Seed mock family for testing
 */
export function seedMockFamily(family: FamilyData | null): void {
  mockFamily = family;
}

/**
 * Get current mock family (for assertions)
 */
export function getMockFamily(): FamilyData | null {
  return mockFamily;
}

function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return message ? { data, message } : { data };
}

// Base URL for API endpoints — must match vitest.config.ts VITE_API_BASE_URL
export const API_BASE = "http://localhost:3000/api";

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
 *   http.get("http://localhost:3000/api/calendar/events", () => {
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
      events = events.filter((e) => parseLocalDate(e.date) >= start);
    }
    if (endDate) {
      const end = parseLocalDate(endDate);
      events = events.filter((e) => parseLocalDate(e.date) <= end);
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

    const newEvent: CalendarEventResponse = {
      id: `event-${Date.now()}`,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      date: body.date,
      memberId: body.memberId,
      isAllDay: body.isAllDay,
      location: body.location,
    };

    mockEvents = [...mockEvents, newEvent];

    return HttpResponse.json(
      createApiResponse(newEvent, "Event created successfully"),
    );
  }),

  // PUT /calendar/events/:id - Update event (full replacement)
  http.put(`${API_BASE}/calendar/events/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as UpdateEventRequest;

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    const updatedEvent: CalendarEventResponse = {
      id: id as string,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      date: body.date,
      memberId: body.memberId,
      isAllDay: body.isAllDay,
      location: body.location,
    };

    mockEvents = [
      ...mockEvents.slice(0, index),
      updatedEvent,
      ...mockEvents.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(updatedEvent, "Event updated successfully"),
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

  // ============================================================================
  // Family API Handlers
  // ============================================================================

  // GET /family - Get family data
  http.get(`${API_BASE}/family`, () => {
    return HttpResponse.json(createApiResponse(mockFamily));
  }),

  // PUT /family - Update family
  http.put(`${API_BASE}/family`, async ({ request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateFamilyRequest;
    mockFamily = {
      ...mockFamily,
      name: body.name,
    };

    return HttpResponse.json(
      createApiResponse(mockFamily, "Family updated successfully"),
    );
  }),

  // DELETE /family - Delete family
  http.delete(`${API_BASE}/family`, () => {
    mockFamily = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /family/members - Add member
  http.post(`${API_BASE}/family/members`, async ({ request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as AddMemberRequest;
    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      name: body.name,
      color: body.color,
      avatarUrl: body.avatarUrl,
      email: body.email,
    };

    mockFamily = {
      ...mockFamily,
      members: [...mockFamily.members, newMember],
    };

    return HttpResponse.json(
      createApiResponse(newMember, "Member added successfully"),
    );
  }),

  // PUT /family/members/:id - Update member
  http.put(`${API_BASE}/family/members/:id`, async ({ params, request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const { id } = params;
    const body = (await request.json()) as UpdateMemberRequest;

    const index = mockFamily.members.findIndex((m) => m.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Member with id "${id}" not found` },
        { status: 404 },
      );
    }

    const existingMember = mockFamily.members[index];
    const updatedMember: FamilyMember = {
      ...existingMember,
      name: body.name,
      color: body.color,
      avatarUrl:
        body.avatarUrl !== undefined
          ? body.avatarUrl
          : existingMember.avatarUrl,
      email: body.email !== undefined ? body.email : existingMember.email,
    };

    mockFamily = {
      ...mockFamily,
      members: [
        ...mockFamily.members.slice(0, index),
        updatedMember,
        ...mockFamily.members.slice(index + 1),
      ],
    };

    return HttpResponse.json(
      createApiResponse(updatedMember, "Member updated successfully"),
    );
  }),

  // DELETE /family/members/:id - Remove member
  http.delete(`${API_BASE}/family/members/:id`, ({ params }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const { id } = params;
    const index = mockFamily.members.findIndex((m) => m.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { message: `Member with id "${id}" not found` },
        { status: 404 },
      );
    }

    mockFamily = {
      ...mockFamily,
      members: mockFamily.members.filter((m) => m.id !== id),
    };

    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================================================
  // Auth API Handlers
  // ============================================================================

  // POST /auth/login - Login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const normalizedUsername = body.username.toLowerCase().trim();

    const user = mockUsers.find((u) => u.username === normalizedUsername);
    if (!user || user.password !== body.password) {
      return HttpResponse.json(
        { message: "Invalid username or password" },
        { status: 401 },
      );
    }

    if (!mockFamily || mockFamily.id !== user.familyId) {
      return HttpResponse.json(
        { message: "Family data not found" },
        { status: 404 },
      );
    }

    const response: LoginResponse = {
      data: {
        token: `mock-token-${normalizedUsername}`,
        family: mockFamily,
      },
      message: "Login successful",
    };

    return HttpResponse.json(response);
  }),

  // POST /auth/register - Register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    const normalizedUsername = body.username.toLowerCase().trim();

    // Check if username exists
    if (mockUsers.some((u) => u.username === normalizedUsername)) {
      return HttpResponse.json(
        { message: "Username already taken", field: "username" },
        { status: 409 },
      );
    }

    // Create family
    mockFamily = {
      id: `family-${Date.now()}`,
      name: body.familyName,
      members: body.members.map((m) => ({
        ...m,
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })),
      createdAt: new Date().toISOString(),
    };

    // Create user
    mockUsers.push({
      username: normalizedUsername,
      password: body.password,
      familyId: mockFamily.id,
    });

    const response: RegisterResponse = {
      data: {
        token: `mock-token-${normalizedUsername}`,
        family: mockFamily,
      },
      message: "Registration successful",
    };

    return HttpResponse.json(response);
  }),

  // GET /auth/check-username - Check username availability
  http.get(`${API_BASE}/auth/check-username`, ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get("username")?.toLowerCase().trim();

    const available = !mockUsers.some((u) => u.username === username);
    const response: UsernameCheckResponse = { data: { available } };

    return HttpResponse.json(response);
  }),
];
