import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SWIPE_CLOSE_THRESHOLD = 60; // px of leftward drag before dismiss

interface SideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for the dialog (visually hidden). */
  title: string;
  children: ReactNode;
  className?: string;
}

export function SideSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: SideSheetProps) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  // True while the panel eases back to rest after a sub-threshold release, so it
  // doesn't teleport. Cleared on transition end to restore the slide animations.
  const [animatingBack, setAnimatingBack] = useState(false);

  const resetGesture = () => {
    startX.current = null;
    startY.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    setAnimatingBack(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    // Only follow the finger once the drag is leftward AND predominantly
    // horizontal, so a vertical scroll never drags the sheet.
    setDragX(deltaX < 0 && Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : 0);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) {
      resetGesture();
      return;
    }
    const touch = e.changedTouches[0];
    const deltaX = (touch?.clientX ?? startX.current) - startX.current;
    const deltaY = (touch?.clientY ?? startY.current) - startY.current;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (isHorizontal && deltaX < -SWIPE_CLOSE_THRESHOLD) {
      onOpenChange(false);
    }
    resetGesture();
    if (dragX !== 0) setAnimatingBack(true);
    setDragX(0);
  };

  const handleTouchCancel = () => {
    // An OS-interrupted gesture must reset without evaluating the close threshold.
    resetGesture();
    if (dragX !== 0) setAnimatingBack(true);
    setDragX(0);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onTransitionEnd={() => setAnimatingBack(false)}
          style={
            dragX !== 0
              ? { transform: `translateX(${dragX}px)`, transition: "none" }
              : animatingBack
                ? { transition: "transform 150ms ease-out" }
                : undefined
          }
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-card shadow-2xl",
            "[padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out duration-200",
            "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
