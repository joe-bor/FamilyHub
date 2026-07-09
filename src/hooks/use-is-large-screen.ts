import { useMediaQuery } from "./use-media-query";

/** Tailwind `lg` breakpoint - the large-screen calendar boundary (spec Scope). */
export const LARGE_SCREEN_BREAKPOINT = 1024;

/**
 * True when the viewport is at least the `lg` breakpoint (1024px). Drives the
 * denser Week rows and the Day member-lanes layout; below this the calendar
 * keeps its current desktop/tablet rendering.
 */
export function useIsLargeScreen(): boolean {
  return useMediaQuery(`(min-width: ${LARGE_SCREEN_BREAKPOINT}px)`);
}
