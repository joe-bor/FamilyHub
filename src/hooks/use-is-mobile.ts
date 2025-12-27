import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 640; // Matches Tailwind's sm: breakpoint

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses matchMedia for efficient, reactive updates.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);

    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
