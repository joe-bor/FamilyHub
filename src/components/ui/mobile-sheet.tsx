import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function MobileSheet({ isOpen, ...props }: MobileSheetProps) {
  if (!isOpen) return null;
  return <MobileSheetContent {...props} />;
}

function MobileSheetContent({
  onClose,
  title,
  headerRight,
  children,
}: Omit<MobileSheetProps, "isOpen">) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Captured during render: by the time effects run, the opener may already
  // be unfocusable (e.g. inside a background the opener marked inert).
  const [openerElement] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }
    return () => {
      openerElement?.focus();
    };
  }, [openerElement]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={title}
      aria-describedby={undefined}
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-card outline-none",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-1 py-1 text-sm font-semibold text-primary"
        >
          Cancel
        </button>
        <h2 className="text-[20px] leading-7 font-semibold">{title}</h2>
        {headerRight ?? <div className="w-16" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">{children}</div>
    </div>
  );
}
