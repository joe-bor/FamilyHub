import { useRef } from "react"
import { type CalendarEvent, familyMembers, colorMap } from "@/lib/calendar-data"
import { CalendarEventCard } from "./calendar-event"
import { cn } from "@/lib/utils"
import type { FilterState } from "./calendar-filter"
import { CurrentTimeIndicator, useAutoScrollToNow } from "./current-time-indicator"

interface WeeklyCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  filter: FilterState
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return { hours: 0, minutes: 0 }

  let hours = Number.parseInt(match[1])
  const minutes = Number.parseInt(match[2])
  const period = match[3].toUpperCase()

  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0

  return { hours, minutes }
}

function getEventTop(startTime: string, startHour = 6) {
  const start = parseTime(startTime)
  const startOffset = start.hours - startHour + start.minutes / 60
  return `${startOffset * 80}px`
}

export function WeeklyCalendar({ events, currentDate, onEventClick, filter }: WeeklyCalendarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  useAutoScrollToNow(scrollContainerRef)

  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  const weekDays = getWeekDays()

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const formatDayNumber = (date: Date) => {
    return date.getDate()
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const getEventsForDay = (date: Date) => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date)
        const dateMatches = eventDate.toDateString() === date.toDateString()
        const memberMatches = filter.selectedMembers.includes(event.memberId)
        const allDayMatches = filter.showAllDayEvents || !event.isAllDay
        return dateMatches && memberMatches && allDayMatches
      })
      .sort((a, b) => {
        const timeA = parseTime(a.startTime)
        const timeB = parseTime(b.startTime)
        return timeA.hours * 60 + timeA.minutes - (timeB.hours * 60 + timeB.minutes)
      })
  }

  const timeSlots = [
    "6 AM",
    "7 AM",
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM",
    "7 PM",
    "8 PM",
    "9 PM",
    "10 PM",
    "11 PM",
  ]

  const gridTemplateColumns = "4rem repeat(7, minmax(0, 1fr))"

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Days header */}
      <div className="grid border-b border-border bg-card shrink-0" style={{ gridTemplateColumns }}>
        {/* Time column spacer */}
        <div className="border-r border-border" />
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={cn("text-center py-3 border-l border-border relative", isToday(date) && "bg-primary/10")}
          >
            <div className={cn("text-sm font-medium", isToday(date) ? "text-primary" : "text-muted-foreground")}>
              {formatDayName(date)}
            </div>
            <div
              className={cn(
                "text-2xl font-bold mt-1",
                isToday(date)
                  ? "text-primary-foreground bg-primary w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                  : "text-foreground",
              )}
            >
              {formatDayNumber(date)}
            </div>
            {isToday(date) && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">
                TODAY
              </span>
            )}
            <div className="flex justify-center gap-1 mt-1.5">
              {familyMembers.slice(0, 4).map((member) => {
                const hasEvent = getEventsForDay(date).some((e) => e.memberId === member.id)
                return hasEvent ? (
                  <div key={member.id} className={cn("w-2 h-2 rounded-full", colorMap[member.color]?.bg)} />
                ) : null
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid with events */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="grid min-h-full" style={{ gridTemplateColumns }}>
          {/* Time column */}
          <div className="bg-card border-r border-border">
            {timeSlots.map((time, index) => (
              <div key={index} className="h-20 flex items-start justify-end pr-2 pt-1 border-b border-border/50">
                <span className="text-xs text-foreground/70 font-semibold">{time}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((date, dayIndex) => {
            const dayEvents = getEventsForDay(date)
            const isTodayColumn = isToday(date)

            return (
              <div key={dayIndex} className={cn("border-l border-border relative", isTodayColumn && "bg-primary/5")}>
                {timeSlots.map((_, index) => (
                  <div
                    key={index}
                    className={cn("h-20 border-b border-border/50", index % 2 === 0 && !isTodayColumn && "bg-muted/20")}
                  />
                ))}

                {isTodayColumn && <CurrentTimeIndicator />}

                <div className="absolute inset-0 px-0.5">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5"
                      style={{ top: getEventTop(event.startTime) }}
                    >
                      <CalendarEventCard event={event} onClick={() => onEventClick?.(event)} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
