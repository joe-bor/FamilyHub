import { type CalendarEvent, familyMembers, colorMap } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { FilterState } from "../components/calendar-filter"
import { CalendarNavigation } from "../components/calendar-navigation"

interface MonthlyCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  filter: FilterState
  onDateSelect?: (date: Date) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  isViewingToday: boolean
}

export function MonthlyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
  onDateSelect,
  onPrevious,
  onNext,
  onToday,
  isViewingToday,
}: MonthlyCalendarProps) {
  const today = new Date()

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: (Date | null)[] = []

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const days = getDaysInMonth()
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const isToday = (date: Date | null) => {
    if (!date) return false
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false
    return date.getMonth() === currentDate.getMonth()
  }

  const getEventsForDay = (date: Date | null) => {
    if (!date) return []
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      const dateMatches = eventDate.toDateString() === date.toDateString()
      const memberMatches = filter.selectedMembers.includes(event.memberId)
      const allDayMatches = filter.showAllDayEvents || !event.isAllDay
      return dateMatches && memberMatches && allDayMatches
    })
  }

  const getMemberForEvent = (memberId: string) => {
    return familyMembers.find((m) => m.id === memberId)
  }

  const getMembersWithEvents = (date: Date | null) => {
    if (!date) return []
    const dayEvents = getEventsForDay(date)
    const memberIds = [...new Set(dayEvents.map((e) => e.memberId))]
    return memberIds.map((id) => familyMembers.find((m) => m.id === id)).filter(Boolean)
  }

  const formatMonthLabel = () => {
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background p-4">
      <CalendarNavigation
        label={formatMonthLabel()}
        onPrevious={onPrevious}
        onNext={onNext}
        onToday={onToday}
        isViewingToday={isViewingToday}
      />

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr">
        {days.map((date, index) => {
          const dayEvents = getEventsForDay(date)
          const busyMembers = getMembersWithEvents(date)

          return (
            <div
              key={index}
              onClick={() => date && onDateSelect?.(date)}
              className={cn(
                "min-h-24 p-2 rounded-lg border cursor-pointer transition-colors",
                date ? "bg-card hover:bg-accent/50" : "bg-transparent border-transparent",
                isToday(date) &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/10 border-primary",
                !isToday(date) && date && "border-border/50",
                !isCurrentMonth(date) && date && "opacity-50",
              )}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isToday(date)
                          ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold"
                          : "text-foreground",
                      )}
                    >
                      {date.getDate()}
                    </div>
                    {busyMembers.length > 0 && (
                      <div className="flex -space-x-1">
                        {busyMembers.slice(0, 3).map((member) => (
                          <div
                            key={member?.id}
                            className={cn(
                              "w-3 h-3 rounded-full border border-card",
                              member ? colorMap[member.color]?.bg : "bg-muted",
                            )}
                            title={member?.name}
                          />
                        ))}
                        {busyMembers.length > 3 && (
                          <div className="w-3 h-3 rounded-full bg-muted border border-card flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground">+</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const member = getMemberForEvent(event.memberId)
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate",
                            member ? colorMap[member.color]?.bg : "bg-muted",
                            "text-white font-medium",
                          )}
                        >
                          {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground font-medium">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
