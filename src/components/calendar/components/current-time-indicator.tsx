import type React from "react";

import { useEffect, useState } from "react";

interface CurrentTimeIndicatorProps {
  startHour?: number;
  rowHeight?: number;
}

export function CurrentTimeIndicator({
  startHour = 6,
  rowHeight = 80,
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  const hourOffset = hours - startHour;
  const minuteOffset = minutes / 60;
  const topPosition = (hourOffset + minuteOffset) * rowHeight;

  if (hours < startHour || hours >= 23) {
    return null;
  }

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      {/* Line */}
      <div
        className="absolute left-3 right-0 h-[2px] bg-primary shadow-[0_0_6px_2px_rgba(139,92,246,0.4)]"
        style={{ top: "-1px" }}
      />
      {/* Dot - positioned at the left edge, centered on the line */}
      <div
        className="absolute left-0 w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_3px_rgba(139,92,246,0.5)] animate-pulse"
        style={{ top: "-6px" }}
      />
    </div>
  );
}

/** Pixels of grid left visible above the target, so it is not flush to the top. */
const SCROLL_LEAD_PX = 200;

/**
 * Scroll `container` so the row `targetMinutes` past the grid's start hour sits
 * SCROLL_LEAD_PX below the top, honouring the user's motion preference.
 *
 * Both auto-scroll hooks route through here so they cannot drift apart: an
 * unconditional `behavior: "smooth"` animates past a reduced-motion request and
 * also makes screenshot tests nondeterministic, since a capture taken shortly
 * after mount lands at a different point on the easing curve each run.
 *
 * The preference is read at scroll time rather than via usePrefersReducedMotion
 * so that toggling it mid-session does not re-run the effect and yank the grid
 * out from under the user.
 */
function scrollToMinutes(
  container: HTMLElement,
  targetMinutes: number,
  rowHeight: number,
) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const scrollPosition = (targetMinutes / 60) * rowHeight - SCROLL_LEAD_PX;

  container.scrollTo({
    top: Math.max(0, scrollPosition),
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

/**
 * Scroll the grid so the current time is comfortably in view. Pass a ref whose
 * `current` is null to skip (e.g. the shown day is not today).
 */
export function useAutoScrollToNow(
  containerRef: React.RefObject<HTMLElement | null>,
  startHour = 6,
  rowHeight = 80,
) {
  useEffect(() => {
    if (!containerRef.current) return;

    const now = new Date();
    const minutesFromStart =
      (now.getHours() - startHour) * 60 + now.getMinutes();

    scrollToMinutes(containerRef.current, minutesFromStart, rowHeight);
  }, [containerRef, startHour, rowHeight]);
}

/**
 * Scroll the grid so a target time is comfortably in view. `targetMinutes` is
 * minutes from the grid's start hour; pass null to skip (e.g. no events and not
 * today). Mirrors useAutoScrollToNow but takes an explicit target so callers can
 * choose "now" or "first event" (spec Section 3, Week auto-scroll).
 */
export function useAutoScrollToMinutes(
  containerRef: React.RefObject<HTMLElement | null>,
  targetMinutes: number | null,
  rowHeight = 80,
) {
  useEffect(() => {
    if (!containerRef.current || targetMinutes == null) return;

    scrollToMinutes(containerRef.current, targetMinutes, rowHeight);
  }, [containerRef, targetMinutes, rowHeight]);
}
