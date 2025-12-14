import type React from "react"

import { type CalendarEvent, familyMembers, colorMap } from "@/lib/calendar-data"
import { cn } from "@/lib/utils"
import type { FilterState } from "./calendar-filter"
import { Clock, MapPin } from "lucide-react"

interface ScheduleCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  filter: FilterState
}

export function ScheduleCalendar({ events, currentDate, onEventClick, filter }: ScheduleCalendarProps) {
  const today = new Date()

  // Get events for the next 14 days grouped by date
  const getGroupedEvents = () => {
    const grouped: { date: Date; events: CalendarEvent[] }[] = []

    for (let i = 0; i < 14; i++) {
      const date = new Date(currentDate)
      date.setDate(currentDate.getDate() + i)

      const dayEvents = events
        .filter((event) => {
          const eventDate = new Date(event.date)
          const dateMatches = eventDate.toDateString() === date.toDateString()
          const memberMatches = filter.selectedMembers.includes(event.memberId)
          const allDayMatches = filter.showAllDayEvents || !event.isAllDay
          return dateMatches && memberMatches && allDayMatches
        })
        .sort((a, b) => {
          const timeA = a.startTime.includes("AM") ? 0 : 12
          const timeB = b.startTime.includes("AM") ? 0 : 12
          const hourA = Number.parseInt(a.startTime) + timeA
          const hourB = Number.parseInt(b.startTime) + timeB
          return hourA - hourB
        })

      if (dayEvents.length > 0) {
        grouped.push({ date, events: dayEvents })
      }
    }

    return grouped
  }

  const getMemberForEvent = (memberId: string) => {
    return familyMembers.find((m) => m.id === memberId)
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today"
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  }

  const groupedEvents = getGroupedEvents()

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4">
      {groupedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Calendar className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No upcoming events</p>
          <p className="text-sm">Events for the next 2 weeks will appear here</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {groupedEvents.map(({ date, events: dayEvents }) => (
            <div key={date.toISOString()}>
              {/* Date header */}
              <div
                className={cn(
                  "sticky top-0 z-10 py-2 px-3 mb-3 rounded-lg font-semibold",
                  isToday(date) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {formatDate(date)}
              </div>

              {/* Events list */}
              <div className="space-y-2 pl-2">
                {dayEvents.map((event) => {
                  const member = getMemberForEvent(event.memberId)
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]",
                        member ? colorMap[member.color]?.light : "bg-muted",
                        "border-l-4",
                        member ? colorMap[member.color]?.bg : "border-muted-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                          member ? colorMap[member.color]?.bg : "bg-muted-foreground",
                        )}
                      >
                        {member?.name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              member ? colorMap[member.color]?.bg : "bg-muted",
                              "text-white",
                            )}
                          >
                            {member?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}
