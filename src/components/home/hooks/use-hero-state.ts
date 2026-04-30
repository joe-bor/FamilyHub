import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { deriveHeroState, type HeroState } from "../lib/hero-state";

export function useDashboardNow(
  nowProvider: () => Date = () => new Date(),
): Date {
  const [now, setNow] = useState(() => nowProvider());

  useEffect(() => {
    const syncNow = () => setNow(nowProvider());
    const intervalId = window.setInterval(syncNow, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [nowProvider]);

  return now;
}

export function useHeroState(
  todayEvents: CalendarEvent[],
  nowProvider: () => Date = () => new Date(),
): {
  state: HeroState;
  now: Date;
} {
  const now = useDashboardNow(nowProvider);
  const state = useMemo(
    () => deriveHeroState({ todayEvents, now }),
    [todayEvents, now],
  );

  return { state, now };
}
