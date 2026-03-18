import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function MobileEventSheet({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
}: MobileEventSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={title}
      aria-describedby={undefined}
      className={cn(
        "fixed inset-0 z-50 bg-card flex flex-col",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200",
      )}
    >
      {/* Fixed header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onClose}
          className="text-primary font-medium text-sm"
        >
          Cancel
        </button>
        <span className="font-bold text-base">{title}</span>
        {
          headerRight ?? (
            <div className="w-16" />
          ) /* Spacer for centering title */
        }
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
