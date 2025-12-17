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
