import { type LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import { MOBILE_FAB_BOTTOM_OFFSET } from "./floating-action-layout";

interface FloatingActionButtonProps {
  /** Action to run when the FAB is pressed. */
  onClick: () => void;
  /** Context-specific accessible name (e.g. "Add recipe"). */
  label: string;
  /** Icon to render; defaults to a plus. */
  icon?: LucideIcon;
  /** Module-specific gating; keeps the accessible name when disabled. */
  disabled?: boolean;
}

/**
 * Shared mobile creation FAB. Owns presentation/layout only — position,
 * size, bottom-nav/safe-area clearance, z-index. Press feedback and haptics
 * come from the underlying `Button`. Modules own the action and label, and
 * decide whether/when to render it.
 */
export function FloatingActionButton({
  onClick,
  label,
  icon: Icon = Plus,
  disabled = false,
}: FloatingActionButtonProps) {
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="fixed right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
      style={{
        bottom: isMobile
          ? MOBILE_FAB_BOTTOM_OFFSET
          : "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
      size="icon"
      aria-label={label}
    >
      <Icon className="h-7 w-7 text-primary-foreground" />
    </Button>
  );
}
