import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MobileSheet,
  type MobileSheetHeight,
} from "@/components/ui/mobile-sheet";
import { useIsMobile } from "@/hooks";

interface ResponsiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sheet header title on mobile AND the DialogTitle on desktop. */
  title: string;
  /** Mobile sheet open height. Desktop is unaffected. Defaults to "full". */
  initialHeight?: MobileSheetHeight;
  /** Desktop DialogContent classes (e.g. "max-w-lg max-h-[90dvh] overflow-y-auto"). */
  dialogClassName?: string;
  /**
   * Desktop DialogTitle classes. Defaults to the DialogTitle primitive size;
   * settings modals pass "text-xl" to preserve their current title size.
   */
  titleClassName?: string;
  /**
   * Desktop-only header content (e.g. an X close button). The mobile sheet
   * supplies its own title + Cancel chrome, so this is omitted on mobile.
   */
  desktopHeaderRight?: ReactNode;
  children: ReactNode;
}

/**
 * Renders form content inside a viewport-bounded `MobileSheet` on mobile and
 * the centered `Dialog`/`DialogContent` on desktop. Children are written once;
 * the wrapper owns the chrome (mobile: Cancel + title; desktop: title + an
 * optional close affordance via `desktopHeaderRight`).
 */
export function ResponsiveFormDialog({
  open,
  onOpenChange,
  title,
  initialHeight = "full",
  dialogClassName,
  titleClassName,
  desktopHeaderRight,
  children,
}: ResponsiveFormDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileSheet
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title={title}
        initialHeight={initialHeight}
      >
        {children}
      </MobileSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName} aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={titleClassName}>{title}</DialogTitle>
            {desktopHeaderRight}
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
