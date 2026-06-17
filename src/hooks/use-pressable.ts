import type { PointerEvent } from "react";
import { useCallback } from "react";

/**
 * Press-feedback visual. The scale is motion-gated (reduced-motion drops it);
 * the tint overlay is always-on (it is feedback). `rounded-[inherit]` so the
 * overlay matches the host element's corners.
 */
export const PRESSABLE =
  "relative transition-transform duration-100 ease-out motion-safe:active:scale-[0.97] " +
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] " +
  "before:bg-foreground before:opacity-0 before:transition-opacity before:duration-100 " +
  "active:before:opacity-[0.06]";

export interface Pressable {
  className: string;
  onPointerDown: (event: PointerEvent) => void;
}

/** Single integration point for press visuals and (later) haptics. */
export function usePressable(): Pressable {
  const onPointerDown = useCallback((_event: PointerEvent) => {
    // Haptic seam: the optional-haptics story adds `useHaptics().tap()` here.
  }, []);
  return { className: PRESSABLE, onPointerDown };
}
