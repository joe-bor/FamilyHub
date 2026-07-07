import { useMemo } from "react";
import { useFamilyMembers, useFamilyName } from "@/api";
import { useDashboardEvents } from "@/components/home/hooks/use-dashboard-events";
import { useDashboardNow } from "@/components/home/hooks/use-hero-state";
import { formatLocalDate, getEventKey } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";
import { useAppStore } from "@/stores";
import { LargeNowHero } from "./components/large-now-hero";
import { LargeStateStrip } from "./components/large-state-strip";
import { LargeTodayRail } from "./components/large-today-rail";
import { useLargeHomeSummaries } from "./hooks/use-large-home-summaries";
import { deriveHeroState } from "./lib/hero-state";
import {
  type HomeSummaryTarget,
  selectRestOfDayItems,
  selectTomorrowPeek,
} from "./lib/large-home-selectors";

function LoadingLargeHome() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.9fr)] gap-6 p-6">
      <div className="animate-pulse rounded-lg bg-card" />
      <div className="animate-pulse rounded-lg bg-card" />
    </div>
  );
}

export function LargeHomeDashboard({
  nowOverride,
}: {
  nowOverride?: Date;
} = {}) {
  const familyName = useFamilyName();
  const members = useFamilyMembers();
  const liveNow = useDashboardNow();
  const now = nowOverride ?? liveNow;
  const { today, comingUp, isLoading, isError, error } = useDashboardEvents({
    currentDate: now,
    memberFocusId: null,
  });
  const summaries = useLargeHomeSummaries({ now });
  const heroState = useMemo(
    () => deriveHeroState({ todayEvents: today, now }),
    [now, today],
  );
  const heroEvent = "event" in heroState ? heroState.event : null;
  const heroMember = heroEvent
    ? members.find((member) => member.id === heroEvent.memberId)
    : undefined;
  const todayItems = useMemo(
    () => selectRestOfDayItems(today, heroEvent, now),
    [heroEvent, now, today],
  );
  const tomorrowItems = useMemo(
    () => selectTomorrowPeek(comingUp, now),
    [comingUp, now],
  );

  const openEvent = (event: CalendarEvent) => {
    useAppStore.getState().openCalendarEvent({
      date: formatLocalDate(event.date),
      eventKey: getEventKey(event),
    });
  };

  const openSummary = (target: HomeSummaryTarget) => {
    const store = useAppStore.getState();
    if (target.module === "chores") store.setActiveModule("chores");
    if (target.module === "lists") {
      if (target.listId) store.openListDetail(target.listId);
      else store.setActiveModule("lists");
    }
    if (target.module === "meals") {
      store.focusMealSlot({
        weekStartDate: target.weekStartDate,
        dayIndex: target.dayIndex,
        mealType: target.mealType,
      });
    }
  };

  if (isLoading) return <LoadingLargeHome />;

  if (isError) {
    return (
      <div className="flex-1 p-8 text-sm text-destructive">
        Error loading events: {error?.message ?? "Unknown error"}
      </div>
    );
  }

  return (
    <div
      data-testid="large-home-dashboard"
      className="flex-1 overflow-y-auto bg-background"
    >
      <div className="mx-auto grid min-h-full max-w-[118rem] grid-cols-[minmax(0,1.42fr)_minmax(22rem,0.88fr)] gap-6 px-6 py-6 lg:px-8 lg:py-8 2xl:gap-8 2xl:px-12 2xl:py-10">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              {familyName || "Family Hub"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Home
            </h1>
          </div>
          <LargeNowHero
            state={heroState}
            member={heroMember}
            now={now}
            onOpenEvent={openEvent}
          />
          <LargeStateStrip summaries={summaries} onSelect={openSummary} />
        </div>
        <LargeTodayRail
          currentDate={now}
          todayItems={todayItems}
          tomorrowItems={tomorrowItems}
          members={members}
          onSelect={openEvent}
        />
      </div>
    </div>
  );
}
