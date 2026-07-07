import { useEffect, useRef } from "react";
import type { ModuleType } from "@/stores";

/**
 * Large screens behave like household appliances: after a long idle period
 * with no interaction, return to Home. 10 minutes is long enough not to
 * interrupt active planning (e.g. reading a recipe, browsing the calendar)
 * while still resetting the shared display between sessions.
 */
export const LARGE_SCREEN_HOME_IDLE_MS = 10 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
] as const;

function hasBlockingSurface(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[role="dialog"], [data-vaul-drawer][data-state="open"]',
    ),
  );
}

export function useLargeScreenHomeIdleReturn({
  enabled,
  activeModule,
  setActiveModule,
  isBlocked,
  idleMs = LARGE_SCREEN_HOME_IDLE_MS,
}: {
  enabled: boolean;
  activeModule: ModuleType | null;
  setActiveModule: (module: ModuleType | null) => void;
  isBlocked?: () => boolean;
  idleMs?: number;
}) {
  const activeModuleRef = useRef(activeModule);
  const setActiveModuleRef = useRef(setActiveModule);
  const isBlockedRef = useRef(isBlocked);

  useEffect(() => {
    activeModuleRef.current = activeModule;
  }, [activeModule]);

  useEffect(() => {
    setActiveModuleRef.current = setActiveModule;
  }, [setActiveModule]);

  useEffect(() => {
    isBlockedRef.current = isBlocked;
  }, [isBlocked]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: ReturnType<typeof window.setTimeout> | null = null;

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (activeModuleRef.current === null) return;
        if (isBlockedRef.current?.() || hasBlockingSurface()) {
          schedule();
          return;
        }
        setActiveModuleRef.current(null);
      }, idleMs);
    };

    schedule();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, schedule, { passive: true });
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, schedule);
      }
    };
  }, [enabled, idleMs]);
}
