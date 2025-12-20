import { type CalendarEvent, colorMap, familyMembers } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  variant?: "default" | "large" | "compact";
}

export function CalendarEventCard({
  event,
  onClick,
  variant = "default",
}: CalendarEventCardProps) {
  const member = familyMembers.find((m) => m.id === event.memberId);
  const colors = member ? colorMap[member.color] : colorMap["bg-coral"];

  if (variant === "large") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "h-full w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] hover:shadow-md",
          colors?.light || "bg-gray-100",
        )}
      >
        <div className="flex items-start gap-3 h-full">
          <div
            className={cn("w-2 rounded-full shrink-0 self-stretch", colors?.bg)}
          />
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                "font-semibold text-base leading-tight",
                colors?.text,
              )}
            >
              {event.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {event.startTime} - {event.endTime}
            </p>
            {event.location && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {event.location}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "h-full w-full text-left rounded-xl p-2 transition-all hover:scale-[1.01] hover:shadow-md",
          colors?.light || "bg-gray-100",
        )}
      >
        <div className="flex items-start gap-2 h-full">
          <div
            className={cn(
              "w-1.5 rounded-full shrink-0 self-stretch",
              colors?.bg,
            )}
          />
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                "font-semibold text-sm leading-tight line-clamp-3",
                colors?.text,
              )}
            >
              {event.title}
            </h4>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-full w-full text-left rounded-xl p-3 transition-all hover:scale-[1.02] hover:shadow-md",
        colors?.light || "bg-gray-100",
      )}
    >
      <div className="flex items-start gap-2 h-full">
        <div
          className={cn("w-1.5 rounded-full shrink-0 self-stretch", colors?.bg)}
        />
        <div className="flex-1 min-w-0">
          <h4
            className={cn("font-semibold text-sm leading-tight", colors?.text)}
          >
            {event.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {event.startTime} - {event.endTime}
          </p>
          {event.location && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {event.location}
            </p>
          )}
        </div>
        <div
          className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1", colors?.bg)}
        />
      </div>
    </button>
  );
}
