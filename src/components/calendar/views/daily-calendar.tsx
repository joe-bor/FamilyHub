import { useRef } from "react"
import { type CalendarEvent, familyMembers, colorMap } from "@/lib/types"
import { CalendarEventCard } from "../components/calendar-event"
import { CalendarNavigation } from "../components/calendar-navigation"
import { cn } from "@/lib/utils"
import type { FilterState } from "../components/calendar-filter"
import { CurrentTimeIndicator, useAutoScrollToNow } from "../components/current-time-indicator"

interface DailyCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  filter: FilterState
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  isViewingToday: boolean
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

const START_HOUR = 6
const ROW_HEIGHT = 80 // px per hour

function getEventGridPosition(startTime: string, endTime: string) {
  const start = parseTime(startTime)
  const end = parseTime(endTime)

  // Calculate row index from start hour (6 AM = row 0)
  const startRow = start.hours - START_HOUR
  const startMinuteOffset = start.minutes / 60

  const endRow = end.hours - START_HOUR
  const endMinuteOffset = end.minutes / 60

  // Calculate top position: row * height + minute offset
  const top = (startRow + startMinuteOffset) * ROW_HEIGHT
  const bottom = (endRow + endMinuteOffset) * ROW_HEIGHT
  const height = Math.max(bottom - top, 30) // Minimum 30px height

  return { top, height }
}

export function DailyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
  onPrevious,
  onNext,
  onToday,
  isViewingToday,
}: DailyCalendarProps) {
  const today = new Date()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const isCurrentDay = currentDate.toDateString() === today.toDateString()
  useAutoScrollToNow(isCurrentDay ? scrollContainerRef : { current: null })

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }

  const getEventsForDay = () => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date)
        const dateMatches = eventDate.toDateString() === currentDate.toDateString()
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

  const dayEvents = getEventsForDay()

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Navigation header */}
      <div className="border-b border-border bg-card shrink-0">
        <CalendarNavigation
          label={formatDateLabel(currentDate)}
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
          isViewingToday={isViewingToday}
        />
      </div>

      {/* Day info header */}
      <div className="flex border-b border-border bg-card shrink-0">
        <div className="w-16 shrink-0" />
        <div className={cn("flex-1 text-center py-4", isToday(currentDate) && "bg-primary/5")}>
          <div className="flex justify-center gap-2">
            {familyMembers.map((member) => {
              const hasEvent = dayEvents.some((e) => e.memberId === member.id)
              return hasEvent ? (
                <div key={member.id} className="flex items-center gap-1">
                  <div className={cn("w-3 h-3 rounded-full", colorMap[member.color]?.bg)} />
                  <span className="text-xs text-muted-foreground">{member.name}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex overflow-y-auto" ref={scrollContainerRef}>
        {/* Time column */}
        <div className="w-16 shrink-0 bg-card border-r border-border">
          {timeSlots.map((time, index) => (
            <div key={index} className="h-20 flex items-start justify-end pr-2 pt-1 border-b border-border/50">
              <span className="text-xs text-foreground/70 font-semibold">{time}</span>
            </div>
          ))}
        </div>

        {/* Day column - relative container for absolute positioned events */}
        <div className={cn("flex-1 relative", isToday(currentDate) && "bg-primary/5")}>
          {/* Grid rows */}
          {timeSlots.map((_, index) => (
            <div key={index} className={cn("h-20 border-b border-border/50", index % 2 === 0 && "bg-muted/30")} />
          ))}

          {isCurrentDay && (
            <div className="absolute inset-0 pointer-events-none">
              <CurrentTimeIndicator />
            </div>
          )}

          {dayEvents.map((event) => {
            const { top, height } = getEventGridPosition(event.startTime, event.endTime)
            return (
              <div
                key={event.id}
                className="absolute left-2 right-2"
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <CalendarEventCard event={event} onClick={() => onEventClick?.(event)} variant="large" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
