import { Repeat } from "lucide-react";
import { useFamilyMembers } from "@/api";
import type { CalendarEvent } from "@/lib/types";
import { colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GoogleBadge({ size = 14 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Google Calendar event"
      className="inline-flex items-center justify-center rounded-full bg-white/70 shadow-sm"
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    </span>
  );
}

export const isGoogleEvent = (event: CalendarEvent) =>
  event.source === "GOOGLE";

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
  const familyMembers = useFamilyMembers();
  const member = getFamilyMember(familyMembers, event.memberId);
  const colors = member ? colorMap[member.color] : colorMap.coral;

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
              {event.isAllDay
                ? "All day"
                : `${event.startTime} - ${event.endTime}`}
              {event.isRecurring && (
                <Repeat className="w-3 h-3 inline-block ml-1.5 -mt-0.5" />
              )}
            </p>
            {event.location && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {event.location}
              </p>
            )}
          </div>
          {isGoogleEvent(event) && (
            <div className="shrink-0 mt-0.5">
              <GoogleBadge size={14} />
            </div>
          )}
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
          {isGoogleEvent(event) && (
            <div className="shrink-0">
              <GoogleBadge size={10} />
            </div>
          )}
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
            {event.isAllDay
              ? "All day"
              : `${event.startTime} - ${event.endTime}`}
          </p>
          {event.location && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {event.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {isGoogleEvent(event) && <GoogleBadge size={12} />}
          {event.isRecurring && (
            <Repeat
              className={cn("w-3 h-3", colors?.text || "text-muted-foreground")}
            />
          )}
          <div className={cn("w-2.5 h-2.5 rounded-full", colors?.bg)} />
        </div>
      </div>
    </button>
  );
}
