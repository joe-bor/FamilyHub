import { type ReactNode, type RefObject, useRef } from "react";
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
  /**
   * Optional mobile sheet Cancel-button handler. Ambient dismissals still call
   * onOpenChange(false); use this when the visible Cancel affordance needs
   * feature-specific close semantics.
   */
  onMobileCancel?: () => void;
  children: ReactNode;
  /**
   * When true, focuses the title element (heading) when the dialog/sheet opens.
   * Default: false — preserves existing focus-to-content behaviour.
   */
  focusTitleOnOpen?: boolean;
  /**
   * When provided, focus returns to this element on close.
   * Forwarded to MobileSheet on mobile; handled via onCloseAutoFocus on desktop.
   * Default: undefined — returns focus to the opener.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
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
  onMobileCancel,
  children,
  focusTitleOnOpen = false,
  returnFocusRef,
}: ResponsiveFormDialogProps) {
  const isMobile = useIsMobile();
  // Ref for the DialogTitle element on desktop (so we can focus it on open)
  const desktopTitleRef = useRef<HTMLHeadingElement | null>(null);

  // Match the app-wide mobile breakpoint exactly so viewport-specific handoffs
  // and the rendered chrome choose the same branch.
  if (isMobile) {
    return (
      <MobileSheet
        isOpen={open}
        onClose={() => onOpenChange(false)}
        onCancel={onMobileCancel}
        title={title}
        initialHeight={initialHeight}
        focusTitleOnOpen={focusTitleOnOpen}
        returnFocusRef={returnFocusRef}
      >
        {children}
      </MobileSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={dialogClassName}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          if (focusTitleOnOpen && desktopTitleRef.current) {
            event.preventDefault();
            desktopTitleRef.current.focus();
          }
          // Otherwise, let Radix handle focus naturally (first focusable element)
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
          // Otherwise, let Radix restore focus to opener naturally
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle
              ref={(el) => {
                desktopTitleRef.current = el;
              }}
              tabIndex={focusTitleOnOpen ? -1 : undefined}
              className={titleClassName}
            >
              {title}
            </DialogTitle>
            {desktopHeaderRight}
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
