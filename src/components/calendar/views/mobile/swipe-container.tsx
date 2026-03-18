import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 20;

interface SwipeContainerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
  className?: string;
}

export function SwipeContainer({
  onSwipeLeft,
  onSwipeRight,
  children,
  className,
}: SwipeContainerProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    const x = touch.clientX;

    // Edge-zone exclusion: ignore swipes near screen edges
    if (x < EDGE_ZONE || x > window.innerWidth - EDGE_ZONE) {
      touchStart.current = null;
      return;
    }

    touchStart.current = { x, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    touchStart.current = null;

    // Ignore if vertical movement exceeds horizontal (user is scrolling)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    // Ignore if below threshold
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    if (deltaX < 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  }

  return (
    <div
      className={cn("flex-1 overflow-hidden", className)}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
