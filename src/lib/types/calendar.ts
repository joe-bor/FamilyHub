export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  date: Date
  memberId: string
  isAllDay?: boolean
  location?: string
}

export type CalendarViewType = "daily" | "weekly" | "monthly" | "schedule"

export interface FilterState {
  selectedMembers: string[]
  showAllDayEvents: boolean
}

// API Request/Response Types
export interface CreateEventRequest {
  title: string
  startTime: string
  endTime: string
  date: string // ISO string for API transport
  memberId: string
  isAllDay?: boolean
  location?: string
}

export interface UpdateEventRequest {
  id: string
  title?: string
  startTime?: string
  endTime?: string
  date?: string
  memberId?: string
  isAllDay?: boolean
  location?: string
}

export interface GetEventsParams {
  startDate?: string
  endDate?: string
  memberId?: string
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    timestamp: number
    requestId: string
  }
}

export interface MutationResponse<T> {
  data: T
  message?: string
}
