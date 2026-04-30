import { Sparkles } from "lucide-react";
import type { FamilyMember } from "@/lib/types";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventDateTime } from "../lib/event-time";
import type { HeroState } from "../lib/hero-state";
import { formatRelativeStart, formatRemainingEnd } from "../lib/relative-time";

function isEventState(
  state: HeroState,
): state is Extract<HeroState, { event: unknown }> {
  return "event" in state;
}

function getSectionLabel(state: HeroState, now: Date): string {
  switch (state.kind) {
    case "RIGHT_NOW":
      return `Right now: ${state.event.title}, ${formatRemainingEnd(getEventDateTime(state.event, "end"), now)}`;
    case "UP_NEXT":
      return `Up next: ${state.event.title}, ${formatRelativeStart(getEventDateTime(state.event, "start"), now)}`;
    case "ALL_DAY_ONLY":
      return `Today: ${state.event.title}`;
    case "REST_OF_DAY_CLEAR":
      return "Rest of day clear";
    case "ALL_CLEAR_TODAY":
      return "All clear today";
  }
}

function getMetaLine(state: HeroState, now: Date): string | null {
  switch (state.kind) {
    case "RIGHT_NOW":
      return `Now · ${formatRemainingEnd(getEventDateTime(state.event, "end"), now)}`;
    case "UP_NEXT":
      return `Up next · ${formatRelativeStart(getEventDateTime(state.event, "start"), now)}`;
    case "ALL_DAY_ONLY":
      return "Today";
    default:
      return null;
  }
}

function getTitle(state: HeroState): string {
  switch (state.kind) {
    case "RIGHT_NOW":
    case "UP_NEXT":
    case "ALL_DAY_ONLY":
      return state.event.title;
    case "REST_OF_DAY_CLEAR":
      return "All clear for the rest of today";
    case "ALL_CLEAR_TODAY":
      return "Nothing on the calendar today";
  }
}

export function HeroCard({
  state,
  member,
  now,
  onTap,
}: {
  state: HeroState;
  member?: FamilyMember;
  now: Date;
  onTap?: () => void;
}) {
  const colors = member ? colorMap[member.color] : null;
  const sectionLabel = getSectionLabel(state, now);
  const metaLine = getMetaLine(state, now);
  const title = getTitle(state);
  const subtitle =
    isEventState(state) && (state.event.location || state.event.description)
      ? state.event.location || state.event.description
      : null;
  const content = (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card px-6 py-7 shadow-md motion-reduce:transition-none">
      {isEventState(state) && colors && (
        <span
          data-testid="hero-accent"
          className="absolute inset-y-5 left-0 w-1 rounded-r-full"
          style={{ backgroundColor: colors.hex }}
        />
      )}

      <div className="pl-2">
        {metaLine && (
          <p className="mb-2 flex items-center gap-2 text-sm text-foreground/70">
            {state.kind === "RIGHT_NOW" && colors && (
              <span
                data-testid="hero-live-dot"
                className="h-2.5 w-2.5 rounded-full bg-current motion-safe:animate-home-breathing-pulse motion-reduce:animate-none"
                style={{ color: colors.hex }}
              />
            )}
            <span>{metaLine}</span>
          </p>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-foreground/60">{subtitle}</p>
            )}
          </div>

          {!isEventState(state) && (
            <Sparkles
              className={cn(
                "mt-1 h-6 w-6 shrink-0 text-foreground/35 motion-safe:animate-home-breathing-fade motion-reduce:animate-none",
              )}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label={sectionLabel} className="px-4 pt-4">
      {isEventState(state) && onTap ? (
        <button
          type="button"
          onClick={onTap}
          aria-label={`${sectionLabel} details`}
          className="block w-full text-left"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </section>
  );
}
