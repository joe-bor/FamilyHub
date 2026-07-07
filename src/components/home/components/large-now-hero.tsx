import { Sparkles } from "lucide-react";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventDateTime } from "../lib/event-time";
import type { HeroState } from "../lib/hero-state";
import { formatRelativeStart, formatRemainingEnd } from "../lib/relative-time";

function isEventState(
  state: HeroState,
): state is Extract<HeroState, { event: CalendarEvent }> {
  return "event" in state;
}

function titleFor(state: HeroState) {
  switch (state.kind) {
    case "RIGHT_NOW":
    case "UP_NEXT":
    case "ALL_DAY_ONLY":
      return state.event.title;
    case "REST_OF_DAY_CLEAR":
      return "Rest of day clear";
    case "ALL_CLEAR_TODAY":
      return "All clear today";
  }
}

function metaFor(state: HeroState, now: Date) {
  switch (state.kind) {
    case "RIGHT_NOW":
      return `Now · ${formatRemainingEnd(getEventDateTime(state.event, "end"), now)}`;
    case "UP_NEXT":
      return `Up next · ${formatRelativeStart(getEventDateTime(state.event, "start"), now)}`;
    case "ALL_DAY_ONLY":
      return "Today";
    case "REST_OF_DAY_CLEAR":
      return "Nothing else scheduled";
    case "ALL_CLEAR_TODAY":
      return "Nothing scheduled";
  }
}

function ariaFor(state: HeroState, now: Date) {
  const prefix =
    state.kind === "RIGHT_NOW"
      ? "Right now"
      : state.kind === "UP_NEXT"
        ? "Up next"
        : state.kind === "ALL_DAY_ONLY"
          ? "Today"
          : "Home status";
  return `${prefix}: ${titleFor(state)}. ${metaFor(state, now)}`;
}

export function LargeNowHero({
  state,
  member,
  now,
  onOpenEvent,
}: {
  state: HeroState;
  member?: FamilyMember;
  now: Date;
  onOpenEvent: (event: CalendarEvent) => void;
}) {
  const colors = member ? colorMap[member.color] : null;
  const event = isEventState(state) ? state.event : null;
  const content = (
    <div className="relative min-h-[22rem] overflow-hidden rounded-lg border border-border/70 bg-card px-8 py-8 shadow-sm lg:min-h-[28rem] lg:px-10 lg:py-10 2xl:min-h-[34rem] 2xl:px-14 2xl:py-14">
      {event && colors && (
        <span
          data-testid="large-hero-accent"
          className="absolute inset-y-8 left-0 w-1.5 rounded-r-full"
          style={{ backgroundColor: colors.hex }}
        />
      )}
      <div className="flex h-full flex-col justify-between gap-8 pl-2">
        <div className="space-y-5">
          <p className="text-lg font-semibold text-foreground/65 lg:text-xl">
            {metaFor(state, now)}
          </p>
          <h2 className="max-w-[12ch] text-6xl font-semibold leading-[1.03] text-foreground lg:text-7xl 2xl:text-8xl">
            {titleFor(state)}
          </h2>
          {event?.location && (
            <p className="max-w-xl text-2xl leading-8 text-foreground/65">
              {event.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          {member && colors ? (
            <>
              <span
                aria-hidden="true"
                className={cn("h-3 w-3 rounded-full", colors.bg)}
              />
              <span>{member.name}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-foreground/35 motion-safe:animate-home-breathing-fade motion-reduce:animate-none" />
              <span>Family schedule</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label="Home status">
      {event ? (
        <button
          type="button"
          onClick={() => onOpenEvent(event)}
          aria-label={ariaFor(state, now)}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </section>
  );
}
