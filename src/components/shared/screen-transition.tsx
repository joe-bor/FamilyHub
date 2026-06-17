import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks";

type Mode = "fade" | "slide";
type Direction = "forward" | "back";

interface ScreenTransitionProps {
  token: string | number | null;
  mode: Mode;
  direction?: Direction;
  children: ReactNode;
}

/** Enter-transition: the incoming screen animates in on `token` change. */
export function ScreenTransition({
  token,
  mode,
  direction = "forward",
  children,
}: ScreenTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(token);
  const reduce = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (prev.current === token) return;
    prev.current = token;
    const el = ref.current;
    if (!el || reduce) return;
    const keyframes: Keyframe[] =
      mode === "slide"
        ? [
            {
              opacity: 0,
              transform: `translateX(${direction === "back" ? "-22%" : "22%"})`,
            },
            { opacity: 1, transform: "none" },
          ]
        : [
            { opacity: 0, transform: "scale(1.012)" },
            { opacity: 1, transform: "none" },
          ];
    el.animate(keyframes, {
      duration: mode === "slide" ? 280 : 200,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
  }, [token, mode, direction, reduce]);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
