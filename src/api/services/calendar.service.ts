import { httpClient } from "@/api/client";
import { calendarMockHandlers, USE_MOCK_API } from "@/api/mocks";
import { parseLocalDate } from "@/lib/time-utils";
import type {
  ApiResponse,
  CalendarEvent,
  CalendarEventResponse,
  CreateEventRequest,
  GetEventsParams,
  UpdateEventRequest,
} from "@/lib/types";

/**
 * Convert a wire-format event response (date as string) to a domain CalendarEvent (date as Date).
 * Centralizes date parsing so components always work with proper Date objects.
 */
function toCalendarEvent(raw: CalendarEventResponse): CalendarEvent {
  return { ...raw, date: parseLocalDate(raw.date) };
}

function mapEventResponse(
  response: ApiResponse<CalendarEventResponse>,
): ApiResponse<CalendarEvent> {
  return { ...response, data: toCalendarEvent(response.data) };
}

function mapEventsResponse(
  response: ApiResponse<CalendarEventResponse[]>,
): ApiResponse<CalendarEvent[]> {
  return { ...response, data: response.data.map(toCalendarEvent) };
}

export const calendarService = {
  async getEvents(
    params?: GetEventsParams,
  ): Promise<ApiResponse<CalendarEvent[]>> {
    if (USE_MOCK_API) {
      return mapEventsResponse(await calendarMockHandlers.getEvents(params));
    }
    return mapEventsResponse(
      await httpClient.get<ApiResponse<CalendarEventResponse[]>>(
        "/calendar/events",
        { params: params as Record<string, string | undefined> },
      ),
    );
  },

  async getEventById(id: string): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return mapEventResponse(await calendarMockHandlers.getEventById(id));
    }
    return mapEventResponse(
      await httpClient.get<ApiResponse<CalendarEventResponse>>(
        `/calendar/events/${id}`,
      ),
    );
  },

  async createEvent(
    request: CreateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return mapEventResponse(await calendarMockHandlers.createEvent(request));
    }
    return mapEventResponse(
      await httpClient.post<ApiResponse<CalendarEventResponse>>(
        "/calendar/events",
        request,
      ),
    );
  },

  async updateEvent(
    id: string,
    request: UpdateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return mapEventResponse(
        await calendarMockHandlers.updateEvent(id, request),
      );
    }
    return mapEventResponse(
      await httpClient.put<ApiResponse<CalendarEventResponse>>(
        `/calendar/events/${id}`,
        request,
      ),
    );
  },

  async deleteEvent(id: string): Promise<void> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.deleteEvent(id);
    }
    return httpClient.delete(`/calendar/events/${id}`);
  },
};
