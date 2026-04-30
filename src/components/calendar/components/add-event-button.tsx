import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import { MOBILE_FAB_BOTTOM_OFFSET } from "./floating-action-layout";

interface AddEventButtonProps {
  onClick: () => void;
}

export function AddEventButton({ onClick }: AddEventButtonProps) {
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={onClick}
      className="fixed right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
      style={{
        bottom: isMobile
          ? MOBILE_FAB_BOTTOM_OFFSET
          : "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
      size="icon"
      aria-label="Add event"
    >
      <Plus className="h-7 w-7 text-primary-foreground" />
    </Button>
  );
}
