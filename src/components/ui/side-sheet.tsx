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
  const [dragX, setDragX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const delta = (e.touches[0]?.clientX ?? startX.current) - startX.current;
    if (delta < 0) setDragX(delta); // track leftward drag only
  };
  const handleTouchEnd = () => {
    if (dragX < -SWIPE_CLOSE_THRESHOLD) onOpenChange(false);
    startX.current = null;
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
          style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
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
