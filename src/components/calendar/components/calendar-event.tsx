import { type CalendarEvent, familyMembers, colorMap } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CalendarEventCardProps {
  event: CalendarEvent
  onClick?: () => void
  variant?: "default" | "large"
}

export function CalendarEventCard({ event, onClick, variant = "default" }: CalendarEventCardProps) {
  const member = familyMembers.find((m) => m.id === event.memberId)
  const colors = member ? colorMap[member.color] : colorMap["bg-coral"]

  if (variant === "large") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] hover:shadow-md",
          colors?.light || "bg-gray-100",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn("w-2 h-full min-h-[60px] rounded-full shrink-0", colors?.bg)} />
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-semibold text-base leading-tight", colors?.text)}>{event.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {event.startTime} - {event.endTime}
            </p>
            {event.location && <p className="text-sm text-muted-foreground truncate mt-1">{event.location}</p>}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                  colors?.bg,
                )}
              >
                {member?.name.charAt(0)}
              </div>
              <span className="text-sm text-muted-foreground">{member?.name}</span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-3 transition-all hover:scale-[1.02] hover:shadow-md",
        colors?.light || "bg-gray-100",
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("w-1.5 h-full min-h-[40px] rounded-full shrink-0", colors?.bg)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold text-sm leading-tight", colors?.text)}>{event.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {event.startTime} - {event.endTime}
          </p>
          {event.location && <p className="text-xs text-muted-foreground truncate mt-0.5">{event.location}</p>}
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1", colors?.bg)} />
      </div>
    </button>
  )
}
