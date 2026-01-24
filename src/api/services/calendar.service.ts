import { httpClient } from "@/api/client";
import { calendarMockHandlers, USE_MOCK_API } from "@/api/mocks";
import type {
  ApiResponse,
  CalendarEvent,
  CreateEventRequest,
  GetEventsParams,
  UpdateEventRequest,
} from "@/lib/types";

export const calendarService = {
  async getEvents(
    params?: GetEventsParams,
  ): Promise<ApiResponse<CalendarEvent[]>> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.getEvents(params);
    }
    return httpClient.get<ApiResponse<CalendarEvent[]>>("/calendar/events", {
      params: params as Record<string, string | undefined>,
    });
  },

  async getEventById(id: string): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.getEventById(id);
    }
    return httpClient.get<ApiResponse<CalendarEvent>>(`/calendar/events/${id}`);
  },

  async createEvent(
    request: CreateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.createEvent(request);
    }
    return httpClient.post<ApiResponse<CalendarEvent>>(
      "/calendar/events",
      request,
    );
  },

  async updateEvent(
    request: UpdateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.updateEvent(request);
    }
    return httpClient.patch<ApiResponse<CalendarEvent>>(
      `/calendar/events/${request.id}`,
      request,
    );
  },

  async deleteEvent(id: string): Promise<void> {
    if (USE_MOCK_API) {
      return calendarMockHandlers.deleteEvent(id);
    }
    return httpClient.delete(`/calendar/events/${id}`);
  },
};
