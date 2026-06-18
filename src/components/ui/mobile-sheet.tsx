import { type ReactNode, useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useBackHandler } from "@/hooks";
import { cn } from "@/lib/utils";

const HALF_SNAP = 0.5;
const FULL_SNAP = 1;
const HALF_SNAP_POINTS: number[] = [HALF_SNAP, FULL_SNAP];
const FULL_SNAP_POINTS: number[] = [FULL_SNAP];

export type MobileSheetHeight = "half" | "full";

export interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /**
   * Height the sheet opens at. "half" sheets are grabbable: drag up or tap
   * the handle to expand, drag down to dismiss, and focusing an input
   * auto-expands to full so the keyboard never hides the form. Use "full"
   * (default) for long or content-heavy forms.
   */
  initialHeight?: MobileSheetHeight;
}

function snapPointsFor(height: MobileSheetHeight) {
  return height === "half" ? HALF_SNAP_POINTS : FULL_SNAP_POINTS;
}

function initialSnapFor(height: MobileSheetHeight) {
  return height === "half" ? HALF_SNAP : FULL_SNAP;
}

export function MobileSheet({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
  initialHeight = "full",
}: MobileSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Snap layout is locked in per open cycle, then follows mid-open
  // initialHeight changes (e.g. recipe chooser -> manual form).
  const [cycleSnapPoints, setCycleSnapPoints] = useState(() =>
    snapPointsFor(initialHeight),
  );
  const [snap, setSnap] = useState<number | string | null>(() =>
    initialSnapFor(initialHeight),
  );

  // Captured during render: by the time effects run, the opener may already
  // be unfocusable (e.g. inside a background the opener marked inert).
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (isOpen && !wasOpenRef.current) {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  wasOpenRef.current = isOpen;

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setCycleSnapPoints(snapPointsFor(initialHeight));
      setSnap(initialSnapFor(initialHeight));
    } else if (isOpen) {
      // Height changed while open: snap to the requested height but keep the
      // cycle's snap points so the sheet stays grabbable.
      setSnap(initialSnapFor(initialHeight));
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialHeight]);

  useBackHandler(isOpen, onClose);

  const isExpandable = cycleSnapPoints === HALF_SNAP_POINTS;
  const isExpanded = snap === FULL_SNAP;

  // Drags that start on the handle get their click retargeted to it by
  // pointer capture; only stationary taps should toggle the snap height.
  const handlePointerOriginRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={cycleSnapPoints}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      fadeFromIndex={0}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" />
        <Drawer.Content
          ref={contentRef}
          tabIndex={-1}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const content = contentRef.current;
            if (content && !content.contains(document.activeElement)) {
              content.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl outline-none",
            "h-[calc(100dvh-env(safe-area-inset-top,0px)-0.75rem)]",
            "md:mx-auto md:max-w-lg",
          )}
        >
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            {isExpandable ? (
              <button
                type="button"
                aria-label={isExpanded ? "Collapse sheet" : "Expand sheet"}
                onPointerDown={(event) => {
                  handlePointerOriginRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                  };
                }}
                onClick={(event) => {
                  const origin = handlePointerOriginRef.current;
                  handlePointerOriginRef.current = null;
                  if (
                    origin &&
                    Math.hypot(
                      event.clientX - origin.x,
                      event.clientY - origin.y,
                    ) > 8
                  ) {
                    return;
                  }
                  setSnap(isExpanded ? HALF_SNAP : FULL_SNAP);
                }}
                className="-my-2 rounded-full px-6 py-3"
              >
                <span className="block h-1.5 w-10 rounded-full bg-muted-foreground/25" />
              </button>
            ) : (
              <span
                aria-hidden
                className="block h-1.5 w-10 rounded-full bg-muted-foreground/25"
              />
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-1 py-1 text-sm font-semibold text-primary"
            >
              Cancel
            </button>
            <Drawer.Title className="text-[20px] leading-7 font-semibold">
              {title}
            </Drawer.Title>
            {headerRight ?? <div className="w-16" />}
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-5 [padding-bottom:max(env(safe-area-inset-bottom),1.25rem)]"
            onFocusCapture={(event) => {
              if (!isExpandable || isExpanded) return;
              if (
                event.target instanceof HTMLElement &&
                event.target.matches(
                  "input, textarea, select, [contenteditable='true']",
                )
              ) {
                setSnap(FULL_SNAP);
              }
            }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
