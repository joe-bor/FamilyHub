export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: Date;
  memberId: string;
  isAllDay?: boolean;
  location?: string;
}

/**
 * Wire-format type matching the real API JSON response.
 * `date` is a "yyyy-MM-dd" string — the service layer maps this
 * to a `CalendarEvent` with a proper Date via `toCalendarEvent()`.
 */
export type CalendarEventResponse = Omit<CalendarEvent, "date"> & {
  date: string;
};

export type CalendarViewType = "daily" | "weekly" | "monthly" | "schedule";

export interface FilterState {
  selectedMembers: string[];
  showAllDayEvents: boolean;
}

// API Request/Response Types
export interface CreateEventRequest {
  title: string;
  startTime: string;
  endTime: string;
  date: string; // ISO string for API transport
  memberId: string;
  isAllDay?: boolean;
  location?: string;
}

export interface UpdateEventRequest {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  memberId: string;
  isAllDay?: boolean;
  location?: string;
}

export interface GetEventsParams {
  startDate?: string;
  endDate?: string;
  memberId?: string;
}

// Re-export unified response type for backwards compatibility
export type { ApiResponse } from "./api-response";
