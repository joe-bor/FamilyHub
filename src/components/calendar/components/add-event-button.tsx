import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddEventButtonProps {
  onClick: () => void;
}

export function AddEventButton({ onClick }: AddEventButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
      size="icon"
      aria-label="Add event"
    >
      <Plus className="h-7 w-7 text-primary-foreground" />
    </Button>
  );
}
